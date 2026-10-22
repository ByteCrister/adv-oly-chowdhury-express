import mongoose from "mongoose";
import { Request } from "express";
import { deleteFromCloudinary } from "./cloudinary.service";
import { getOneMonthRetentionCutoff } from "../utils/retention.util";
import { withTransaction } from "../utils/transaction.util";
import { recordAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../utils/audit.util";
import { ASSET_STATUSES } from "../constants/asset.const";
import { CRON_DEFAULTS, CRON_JOB_NAMES } from "../constants/cron.const";
import type { CronMediaCleanupResponse } from "../types/cron.types";

// Mongoose Models
import { Asset } from "../models/Asset.model";
import { AssetReference } from "../models/AssetReference.model";
import { User } from "../models/User.model";
import { CaseDocument } from "../models/CaseDocument.model";
import { ClientDocument } from "../models/ClientDocument.model";
import { CaseExpense } from "../models/CaseExpense.model";
import { ClientPayment } from "../models/ClientPayment.model";
import { CaseEvent } from "../models/CaseEvent.model";

/**
 * Checks if a physical Asset is genuinely unreferenced across all application collections.
 *
 * Checks:
 * 1. AssetReference collection: counts ALL references (active or within retention).
 * 2. User profile: checks direct signatureAssetId reference.
 * 3. Defensive entity guards: checks if any legacy/unnormalized document directly references the assetId.
 */
export async function isAssetGenuinelyOrphaned(
  assetId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<boolean> {
  // 1. Any AssetReference existing in the database (active or within retention window)
  const refQuery = AssetReference.countDocuments({ assetId });
  if (session) refQuery.session(session);
  const refCount = await refQuery;
  if (refCount > 0) {
    return false;
  }

  // 2. Direct reference in User model (signatureAssetId points directly to Asset)
  const userDirectQuery = User.exists({ signatureAssetId: assetId });
  if (session) userDirectQuery.session(session);
  const userDirect = await userDirectQuery;
  if (userDirect) {
    return false;
  }

  // 3. Defensive checks on document collections (including both field casing variations for payments)
  const [caseDoc, clientDoc, expense, payment, event] = await Promise.all([
    CaseDocument.exists({ assetReferenceId: assetId }),
    ClientDocument.exists({ assetReferenceId: assetId }),
    CaseExpense.exists({ receiptAssetReferenceId: assetId }),
    ClientPayment.exists({
      $or: [
        { receiptAssetreferenceId: assetId },
        { receiptAssetReferenceId: assetId as unknown as mongoose.Types.ObjectId },
      ],
    }),
    CaseEvent.exists({ assetReferenceId: assetId }),
  ]);

  if (caseDoc || clientDoc || expense || payment || event) {
    return false;
  }

  return true;
}

/**
 * Executes media cleanup workflow for soft-deleted asset references and orphaned physical assets.
 *
 * Sequence & Guarantees:
 * 1. Retry Phase: Re-attempts Cloudinary destruction for any assets previously stuck in 'deleted' status.
 * 2. Reference Purge Phase: Permanently removes soft-deleted AssetReferences whose retention period has passed.
 * 3. Orphan Detection & Safe Cloudinary Purge Phase:
 *    - Re-evaluates unlinked physical assets older than the 1-month retention period.
 *    - Atomically claims the asset in MongoDB ('ready' -> 'deleted') to prevent concurrent reuse.
 *    - Re-verifies reference count inside the claimed state.
 *    - Calls Cloudinary uploader.destroy outside database transactions to avoid open transaction timeouts.
 *    - On Cloudinary success ('ok' or 'not found'), permanently removes the MongoDB Asset record.
 *    - On Cloudinary network/rate-limit error, leaves the asset in 'deleted' state for safe retry.
 *
 * @param batchLimit - Number of records to process per batch (default: 50, max: 100)
 * @param req - Optional Express request for client metadata in audit logs
 */
export async function executeMediaCleanup(
  batchLimit: number = CRON_DEFAULTS.DEFAULT_BATCH_LIMIT,
  req?: Request
): Promise<CronMediaCleanupResponse> {
  const boundedLimit = Math.min(
    Math.max(batchLimit, 1),
    CRON_DEFAULTS.MAX_BATCH_LIMIT
  );

  const now = new Date();
  const cutoffDate = getOneMonthRetentionCutoff(now);

  const referencesResult = {
    scanned: 0,
    eligible: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  const assetsResult = {
    retried: 0,
    orphansScanned: 0,
    eligible: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  let totalPurgedFromCloudinary = 0;
  let hasMore = false;

  // ---------------------------------------------------------------------------
  // Phase 1: Retry Previous Partial Failures (Assets in 'deleted' status)
  // ---------------------------------------------------------------------------
  const pendingRetryAssets = await Asset.find({
    status: ASSET_STATUSES.DELETED,
  })
    .limit(boundedLimit)
    .lean();

  for (const pendingAsset of pendingRetryAssets) {
    try {
      // Re-confirm genuinely orphaned before deleting remote CDN file
      const stillOrphaned = await isAssetGenuinelyOrphaned(pendingAsset._id);
      if (!stillOrphaned) {
        // Asset acquired a reference; restore status to READY
        await Asset.updateOne(
          { _id: pendingAsset._id },
          { $set: { status: ASSET_STATUSES.READY } }
        );
        assetsResult.skipped++;
        continue;
      }

      // Call Cloudinary to destroy the remote resource
      const cloudResult = await deleteFromCloudinary(
        pendingAsset.publicId,
        pendingAsset.resourceType as "image" | "video" | "raw" | "auto"
      );

      if (cloudResult.result === "ok" || cloudResult.result === "not found") {
        await Asset.deleteOne({
          _id: pendingAsset._id,
          status: ASSET_STATUSES.DELETED,
        });
        assetsResult.retried++;
        totalPurgedFromCloudinary++;
      } else {
        console.warn(
          `[CRON MEDIA] Cloudinary retry returned unexpected result for ${pendingAsset.publicId}:`,
          cloudResult
        );
      }
    } catch (retryErr) {
      assetsResult.failed++;
      console.error(
        `[CRON MEDIA] Retry failed for pending asset ${pendingAsset._id} (${pendingAsset.publicId}):`,
        retryErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Permanently Delete Soft-Deleted AssetReferences
  // ---------------------------------------------------------------------------
  const eligibleReferences = await AssetReference.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (eligibleReferences.length > boundedLimit) {
    hasMore = true;
    eligibleReferences.pop();
  }

  referencesResult.scanned = eligibleReferences.length;
  referencesResult.eligible = eligibleReferences.length;

  // Track unlinked asset IDs to inspect for orphan status in Phase 3
  const candidateAssetIds = new Set<string>();

  for (const ref of eligibleReferences) {
    try {
      await withTransaction(async (session) => {
        // Atomic deletion: only delete if still soft-deleted and retention elapsed
        const deletedRef = await AssetReference.findOneAndDelete(
          {
            _id: ref._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          },
          session ? { session } : {}
        );

        if (!deletedRef) {
          referencesResult.skipped++;
          return;
        }

        referencesResult.deleted++;
        candidateAssetIds.add(deletedRef.assetId.toString());

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.ASSET_REFERENCE,
          entityId: ref._id,
          oldValues: {
            assetId: ref.assetId,
            originalFileName: ref.originalFileName,
            deletedAt: ref.deletedAt,
          },
          description: `Permanently purged soft-deleted media reference "${ref.originalFileName || ref._id}"`,
          session,
        });
      });
    } catch (refErr) {
      referencesResult.failed++;
      console.error(
        `[CRON MEDIA] Failed to delete AssetReference ${ref._id}:`,
        refErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Evaluate & Clean Up Orphaned Assets Across MongoDB & Cloudinary
  // ---------------------------------------------------------------------------
  const candidateIdObjects = Array.from(candidateAssetIds).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const candidateAssets = await Asset.find({
    $or: [
      { _id: { $in: candidateIdObjects }, status: ASSET_STATUSES.READY },
      {
        status: ASSET_STATUSES.READY,
        createdAt: { $lte: cutoffDate },
      },
    ],
  })
    .limit(boundedLimit)
    .lean();

  assetsResult.orphansScanned = candidateAssets.length;

  for (const asset of candidateAssets) {
    try {
      // 1. Retention Requirement: Asset must be at least 1 month old to protect in-flight uploads
      if (new Date(asset.createdAt) > cutoffDate) {
        assetsResult.skipped++;
        continue;
      }

      // 2. Pre-check: Verify no references remain in database
      const isOrphan = await isAssetGenuinelyOrphaned(asset._id);
      if (!isOrphan) {
        assetsResult.skipped++;
        continue;
      }

      assetsResult.eligible++;

      // 3. Atomic Claim: Transition asset status to 'deleted' to prevent concurrent reuse
      const claimedAsset = await Asset.findOneAndUpdate(
        {
          _id: asset._id,
          status: ASSET_STATUSES.READY,
          createdAt: { $lte: cutoffDate },
        },
        {
          $set: { status: ASSET_STATUSES.DELETED },
        },
        { new: true }
      );

      if (!claimedAsset) {
        // Another worker claimed the asset or it was modified
        assetsResult.skipped++;
        continue;
      }

      // 4. Double-check inside claimed state: ensure no reference was linked concurrently
      const postClaimOrphan = await isAssetGenuinelyOrphaned(claimedAsset._id);
      if (!postClaimOrphan) {
        // Revert claim
        await Asset.updateOne(
          { _id: claimedAsset._id },
          { $set: { status: ASSET_STATUSES.READY } }
        );
        assetsResult.skipped++;
        continue;
      }

      // 5. Cloudinary Destruction (Outside database transaction to prevent timeouts)
      try {
        const cloudResult = await deleteFromCloudinary(
          claimedAsset.publicId,
          claimedAsset.resourceType as "image" | "video" | "raw" | "auto"
        );

        if (cloudResult.result === "ok" || cloudResult.result === "not found") {
          // 6. Cloudinary deletion confirmed: permanently remove Asset record from MongoDB
          await Asset.deleteOne({
            _id: claimedAsset._id,
            status: ASSET_STATUSES.DELETED,
          });
          assetsResult.deleted++;
          totalPurgedFromCloudinary++;
        } else {
          console.warn(
            `[CRON MEDIA] Cloudinary returned non-ok result for asset ${claimedAsset.publicId}:`,
            cloudResult
          );
        }
      } catch (cloudErr) {
        // Cloudinary network/rate-limit error: Asset remains marked 'deleted' in MongoDB
        // and will be retried in Phase 1 on the next cron execution
        assetsResult.failed++;
        console.error(
          `[CRON MEDIA] Cloudinary API call failed for asset ${claimedAsset._id} (${claimedAsset.publicId}). Marked for retry:`,
          cloudErr
        );
      }
    } catch (assetErr) {
      assetsResult.failed++;
      console.error(
        `[CRON MEDIA] Unexpected error during asset cleanup for ${asset._id}:`,
        assetErr
      );
    }
  }

  const totalFailed = referencesResult.failed + assetsResult.failed;

  return {
    success: totalFailed === 0,
    job: CRON_JOB_NAMES.MEDIA_CLEANUP,
    retentionCutoff: cutoffDate.toISOString(),
    processedAt: now.toISOString(),
    batchLimit: boundedLimit,
    references: referencesResult,
    assets: assetsResult,
    totalPurgedFromCloudinary,
    hasMore,
    message: `Media cleanup completed. ${referencesResult.deleted} references deleted, ${assetsResult.deleted} orphaned assets purged from Cloudinary and MongoDB, ${assetsResult.retried} retried, ${totalFailed} failed.`,
  };
}
