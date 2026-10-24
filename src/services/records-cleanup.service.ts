import { Request } from "express";
import { getOneMonthRetentionCutoff } from "../utils/retention.util";
import { withTransaction } from "../utils/transaction.util";
import { recordAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../utils/audit.util";
import { ASSET_OWNER_TYPES } from "../constants/asset-reference.const";
import { CRON_DEFAULTS, CRON_JOB_NAMES } from "../constants/cron.const";
import type {
  CronRecordsCleanupResponse,
  CronCollectionCleanResult,
} from "../types/cron.types";

// Mongoose Models
import { Task } from "../models/Task.model";
import { CaseDocument } from "../models/CaseDocument.model";
import { ClientDocument } from "../models/ClientDocument.model";
import { Case } from "../models/Case.model";
import { Hearing } from "../models/Hearing.model";
import { CaseEvent } from "../models/CaseEvent.model";
import { CaseExpense } from "../models/CaseExpense.model";
import { CaseParty } from "../models/CaseParty.model";
import { ClientPayment } from "../models/ClientPayment.model";
import { Client } from "../models/Client.model";
import { Court } from "../models/Court.model";
import { AssetReference } from "../models/AssetReference.model";
import { PasswordResetRequest } from "../models/PasswordResetRequest.model";

function createEmptyCleanResult(): CronCollectionCleanResult {
  return { scanned: 0, eligible: 0, deleted: 0, skipped: 0, failed: 0 };
}

/**
 * Shared Core Cleanup Handler for Soft-Deleted Database Records.
 *
 * Implements strict referential integrity in topological dependency order:
 * 1. Tasks (Independent leaf documents)
 * 2. CaseDocuments (Case-linked leaf documents)
 * 3. ClientDocuments (Client-linked leaf documents)
 * 4. Cases (Aggregates; verifies no remaining documents or active tasks, cascades tightly-coupled
 *    hearings/parties/events/expenses, unlinks financial payments, and purges case)
 * 5. Clients (Root entities; verifies no remaining cases, financial payments, documents, active tasks, or parties)
 * 6. Courts (Chamber registries; verifies no remaining cases, hearings, or active attachments)
 *
 * @param batchLimit - Number of records to process per batch (default: 50, max: 100)
 * @param req - Optional Express request for client metadata in audit logs
 */
export async function executeRecordsCleanup(
  batchLimit: number = CRON_DEFAULTS.DEFAULT_BATCH_LIMIT,
  req?: Request
): Promise<CronRecordsCleanupResponse> {
  const boundedLimit = Math.min(
    Math.max(batchLimit, 1),
    CRON_DEFAULTS.MAX_BATCH_LIMIT
  );

  const now = new Date();
  const cutoffDate = getOneMonthRetentionCutoff(now);

  const counts: CronRecordsCleanupResponse["counts"] = {
    tasks: createEmptyCleanResult(),
    caseDocuments: createEmptyCleanResult(),
    clientDocuments: createEmptyCleanResult(),
    cases: createEmptyCleanResult(),
    clients: createEmptyCleanResult(),
    courts: createEmptyCleanResult(),
    passwordResetRequests: createEmptyCleanResult(),
  };

  let hasMore = false;

  // ---------------------------------------------------------------------------
  // Phase 1: Purge Soft-Deleted Tasks (Leaf Entities)
  // ---------------------------------------------------------------------------
  const eligibleTasks = await Task.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (eligibleTasks.length > boundedLimit) {
    hasMore = true;
    eligibleTasks.pop();
  }

  counts.tasks.scanned = eligibleTasks.length;
  counts.tasks.eligible = eligibleTasks.length;

  for (const task of eligibleTasks) {
    try {
      await withTransaction(async (session) => {
        // Re-verify eligibility inside transaction to prevent racing concurrent restoration
        const deletedTask = await Task.findOneAndDelete(
          {
            _id: task._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          },
          session ? { session } : {}
        );

        if (!deletedTask) {
          counts.tasks.skipped++;
          return;
        }

        counts.tasks.deleted++;

        // Record permanent deletion audit log
        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.TASK,
          entityId: task._id,
          oldValues: { title: task.title, deletedAt: task.deletedAt },
          description: `Permanently purged soft-deleted task "${task.title}" (exceeded 1-month retention)`,
          session,
        });
      });
    } catch (taskErr) {
      counts.tasks.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete task ${task._id}:`,
        taskErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Purge Soft-Deleted Case Documents (Leaf Entities)
  // ---------------------------------------------------------------------------
  const eligibleCaseDocs = await CaseDocument.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (eligibleCaseDocs.length > boundedLimit) {
    hasMore = true;
    eligibleCaseDocs.pop();
  }

  counts.caseDocuments.scanned = eligibleCaseDocs.length;
  counts.caseDocuments.eligible = eligibleCaseDocs.length;

  for (const doc of eligibleCaseDocs) {
    try {
      await withTransaction(async (session) => {
        const deletedDoc = await CaseDocument.findOneAndDelete(
          {
            _id: doc._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          },
          session ? { session } : {}
        );

        if (!deletedDoc) {
          counts.caseDocuments.skipped++;
          return;
        }

        counts.caseDocuments.deleted++;

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.CASE_DOCUMENT,
          entityId: doc._id,
          oldValues: {
            title: doc.title,
            caseId: doc.caseId,
            deletedAt: doc.deletedAt,
          },
          description: `Permanently purged soft-deleted case document "${doc.title}" (exceeded 1-month retention)`,
          session,
        });
      });
    } catch (docErr) {
      counts.caseDocuments.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete CaseDocument ${doc._id}:`,
        docErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Purge Soft-Deleted Client Documents (Leaf Entities)
  // ---------------------------------------------------------------------------
  const eligibleClientDocs = await ClientDocument.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (eligibleClientDocs.length > boundedLimit) {
    hasMore = true;
    eligibleClientDocs.pop();
  }

  counts.clientDocuments.scanned = eligibleClientDocs.length;
  counts.clientDocuments.eligible = eligibleClientDocs.length;

  for (const doc of eligibleClientDocs) {
    try {
      await withTransaction(async (session) => {
        const deletedDoc = await ClientDocument.findOneAndDelete(
          {
            _id: doc._id,
            deletedAt: { $ne: null, $lte: cutoffDate },
          },
          session ? { session } : {}
        );

        if (!deletedDoc) {
          counts.clientDocuments.skipped++;
          return;
        }

        counts.clientDocuments.deleted++;

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.CLIENT_DOCUMENT,
          entityId: doc._id,
          oldValues: {
            title: doc.title,
            clientId: doc.clientId,
            deletedAt: doc.deletedAt,
          },
          description: `Permanently purged soft-deleted client document "${doc.title}" (exceeded 1-month retention)`,
          session,
        });
      });
    } catch (docErr) {
      counts.clientDocuments.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete ClientDocument ${doc._id}:`,
        docErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 4: Purge Soft-Deleted Cases (With Referential Integrity Guards)
  // ---------------------------------------------------------------------------
  const candidateCases = await Case.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (candidateCases.length > boundedLimit) {
    hasMore = true;
    candidateCases.pop();
  }

  counts.cases.scanned = candidateCases.length;

  for (const caseItem of candidateCases) {
    try {
      // Referential Integrity Check 1: Ensure no case documents remain (active or unpurged)
      const remainingDocs = await CaseDocument.countDocuments({
        caseId: caseItem._id,
      });

      if (remainingDocs > 0) {
        counts.cases.skipped++;
        continue;
      }

      // Referential Integrity Check 2: Ensure no active tasks reference this case
      const activeTasks = await Task.countDocuments({
        caseId: caseItem._id,
        deletedAt: null,
      });

      if (activeTasks > 0) {
        counts.cases.skipped++;
        continue;
      }

      counts.cases.eligible++;

      await withTransaction(async (session) => {
        const query = Case.findOne({
          _id: caseItem._id,
          deletedAt: { $ne: null, $lte: cutoffDate },
        });
        if (session) query.session(session);
        const caseToDelete = await query;

        if (!caseToDelete) {
          counts.cases.skipped++;
          return;
        }

        // Cascade delete tightly coupled non-soft-deleted child records
        const sessionOpts = session ? { session } : {};
        await Hearing.deleteMany({ caseId: caseItem._id }, sessionOpts);
        await CaseEvent.deleteMany({ caseId: caseItem._id }, sessionOpts);
        await CaseExpense.deleteMany({ caseId: caseItem._id }, sessionOpts);
        await CaseParty.deleteMany({ caseId: caseItem._id }, sessionOpts);

        // Decouple optional references in financial payments and tasks
        await ClientPayment.updateMany(
          { caseId: caseItem._id },
          { $set: { caseId: null } },
          sessionOpts
        );
        await Task.updateMany(
          { caseId: caseItem._id },
          { $set: { caseId: null } },
          sessionOpts
        );

        // Soft-delete any remaining asset references directly owned by this case
        await AssetReference.updateMany(
          {
            ownerType: ASSET_OWNER_TYPES.CASE,
            ownerId: caseItem._id,
            deletedAt: null,
          },
          { $set: { deletedAt: new Date() } },
          sessionOpts
        );

        // Permanently purge case record
        await Case.deleteOne({ _id: caseItem._id }, sessionOpts);
        counts.cases.deleted++;

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.CASE,
          entityId: caseItem._id,
          oldValues: {
            title: caseItem.title,
            internalReference: caseItem.internalReference,
            deletedAt: caseItem.deletedAt,
          },
          description: `Permanently purged archived case "${caseItem.title}" (${caseItem.internalReference}) and cascaded child records`,
          session,
        });
      });
    } catch (caseErr) {
      counts.cases.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete Case ${caseItem._id}:`,
        caseErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 5: Purge Soft-Deleted Clients (With Association Guards)
  // ---------------------------------------------------------------------------
  const candidateClients = await Client.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (candidateClients.length > boundedLimit) {
    hasMore = true;
    candidateClients.pop();
  }

  counts.clients.scanned = candidateClients.length;

  for (const clientItem of candidateClients) {
    try {
      // Association Guard: Check linked cases, payments, docs, tasks, parties
      const [linkedCases, linkedPayments, linkedDocs, linkedTasks, linkedParties] =
        await Promise.all([
          Case.countDocuments({ clientId: clientItem._id }),
          ClientPayment.countDocuments({ clientId: clientItem._id }),
          ClientDocument.countDocuments({ clientId: clientItem._id }),
          Task.countDocuments({ clientId: clientItem._id, deletedAt: null }),
          CaseParty.countDocuments({ clientId: clientItem._id }),
        ]);

      if (
        linkedCases > 0 ||
        linkedPayments > 0 ||
        linkedDocs > 0 ||
        linkedTasks > 0 ||
        linkedParties > 0
      ) {
        counts.clients.skipped++;
        continue;
      }

      counts.clients.eligible++;

      await withTransaction(async (session) => {
        const query = Client.findOne({
          _id: clientItem._id,
          deletedAt: { $ne: null, $lte: cutoffDate },
        });
        if (session) query.session(session);
        const clientToDelete = await query;

        if (!clientToDelete) {
          counts.clients.skipped++;
          return;
        }

        const sessionOpts = session ? { session } : {};

        // Soft-delete remaining asset references owned by this client
        await AssetReference.updateMany(
          {
            ownerType: ASSET_OWNER_TYPES.CLIENT,
            ownerId: clientItem._id,
            deletedAt: null,
          },
          { $set: { deletedAt: new Date() } },
          sessionOpts
        );

        // Decouple soft-deleted task client references
        await Task.updateMany(
          { clientId: clientItem._id },
          { $set: { clientId: null } },
          sessionOpts
        );

        // Permanently purge client record
        await Client.deleteOne({ _id: clientItem._id }, sessionOpts);
        counts.clients.deleted++;

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.CLIENT,
          entityId: clientItem._id,
          oldValues: {
            name: clientItem.name,
            clientNumber: clientItem.clientNumber,
            deletedAt: clientItem.deletedAt,
          },
          description: `Permanently purged archived client "${clientItem.name}" (${clientItem.clientNumber})`,
          session,
        });
      });
    } catch (clientErr) {
      counts.clients.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete Client ${clientItem._id}:`,
        clientErr
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 6: Purge Soft-Deleted Courts (With Association Guards)
  // ---------------------------------------------------------------------------
  const candidateCourts = await Court.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (candidateCourts.length > boundedLimit) {
    hasMore = true;
    candidateCourts.pop();
  }

  counts.courts.scanned = candidateCourts.length;

  for (const courtItem of candidateCourts) {
    try {
      const [linkedCases, linkedHearings, linkedAssets] = await Promise.all([
        Case.countDocuments({ courtId: courtItem._id }),
        Hearing.countDocuments({ courtId: courtItem._id }),
        AssetReference.countDocuments({
          ownerType: ASSET_OWNER_TYPES.COURT,
          ownerId: courtItem._id,
          deletedAt: null,
        }),
      ]);

      if (linkedCases > 0 || linkedHearings > 0 || linkedAssets > 0) {
        counts.courts.skipped++;
        continue;
      }

      counts.courts.eligible++;

      await withTransaction(async (session) => {
        const query = Court.findOne({
          _id: courtItem._id,
          deletedAt: { $ne: null, $lte: cutoffDate },
        });
        if (session) query.session(session);
        const courtToDelete = await query;

        if (!courtToDelete) {
          counts.courts.skipped++;
          return;
        }

        const sessionOpts = session ? { session } : {};
        await Court.deleteOne({ _id: courtItem._id }, sessionOpts);
        counts.courts.deleted++;

        await recordAuditLog({
          req,
          action: AUDIT_ACTIONS.DELETE,
          entityType: AUDIT_ENTITY_TYPES.COURT,
          entityId: courtItem._id,
          oldValues: {
            name: courtItem.name,
            courtType: courtItem.courtType,
            deletedAt: courtItem.deletedAt,
          },
          description: `Permanently purged archived court "${courtItem.name}"`,
          session,
        });
      });
    } catch (courtErr) {
      counts.courts.failed++;
      console.error(
        `[CRON CLEANUP] Failed to permanently delete Court ${courtItem._id}:`,
        courtErr
      );
    }
  }


  // ---------------------------------------------------------------------------
  // Phase 7: Purge Stale Password Reset Requests
  // ---------------------------------------------------------------------------
  // Clean up requests that are in a terminal state (consumed, expired, superseded)
  // AND were created more than the retention period ago.
  // Active/verified requests are left untouched so in-flight resets still work.
  // MongoDB's TTL index on expiresAt auto-purges after 2 hours, but terminal
  // records that linger beyond the retention window are cleaned here too.
  const candidateResetRequests = await PasswordResetRequest.find({
    status: { $in: ["consumed", "expired", "superseded"] },
    createdAt: { $lte: cutoffDate },
  })
    .limit(boundedLimit + 1)
    .lean();

  if (candidateResetRequests.length > boundedLimit) {
    hasMore = true;
    candidateResetRequests.pop();
  }

  counts.passwordResetRequests.scanned = candidateResetRequests.length;
  counts.passwordResetRequests.eligible = candidateResetRequests.length;

  for (const resetReq of candidateResetRequests) {
    try {
      const deleted = await PasswordResetRequest.deleteOne({ _id: resetReq._id });
      if (deleted.deletedCount > 0) {
        counts.passwordResetRequests.deleted++;
      } else {
        counts.passwordResetRequests.skipped++;
      }
    } catch (resetErr) {
      counts.passwordResetRequests.failed++;
      console.error(
        `[CRON CLEANUP] Failed to delete PasswordResetRequest ${resetReq._id}:`,
        resetErr
      );
    }
  }

  const totalScanned =
    counts.tasks.scanned +
    counts.caseDocuments.scanned +
    counts.clientDocuments.scanned +
    counts.cases.scanned +
    counts.clients.scanned +
    counts.courts.scanned +
    counts.passwordResetRequests.scanned;

  const totalEligible =
    counts.tasks.eligible +
    counts.caseDocuments.eligible +
    counts.clientDocuments.eligible +
    counts.cases.eligible +
    counts.clients.eligible +
    counts.courts.eligible +
    counts.passwordResetRequests.eligible;

  const totalDeleted =
    counts.tasks.deleted +
    counts.caseDocuments.deleted +
    counts.clientDocuments.deleted +
    counts.cases.deleted +
    counts.clients.deleted +
    counts.courts.deleted +
    counts.passwordResetRequests.deleted;

  const totalSkipped =
    counts.tasks.skipped +
    counts.caseDocuments.skipped +
    counts.clientDocuments.skipped +
    counts.cases.skipped +
    counts.clients.skipped +
    counts.courts.skipped +
    counts.passwordResetRequests.skipped;

  const totalFailed =
    counts.tasks.failed +
    counts.caseDocuments.failed +
    counts.clientDocuments.failed +
    counts.cases.failed +
    counts.clients.failed +
    counts.courts.failed +
    counts.passwordResetRequests.failed;

  return {
    success: totalFailed === 0,
    job: CRON_JOB_NAMES.RECORDS_CLEANUP,
    retentionCutoff: cutoffDate.toISOString(),
    processedAt: now.toISOString(),
    batchLimit: boundedLimit,
    counts,
    totalScanned,
    totalEligible,
    totalDeleted,
    totalSkipped,
    totalFailed,
    hasMore,
    message: `Database records cleanup completed. ${totalDeleted} permanently deleted, ${totalSkipped} skipped due to dependencies/restoration, ${totalFailed} failed.`,
  };
}