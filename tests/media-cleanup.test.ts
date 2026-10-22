import mongoose from "mongoose";
import { isAssetGenuinelyOrphaned, executeMediaCleanup } from "../src/services/media-cleanup.service";
import * as cloudinaryService from "../src/services/cloudinary.service";
import { Asset } from "../src/models/Asset.model";
import { AssetReference } from "../src/models/AssetReference.model";
import { User } from "../src/models/User.model";
import { CaseDocument } from "../src/models/CaseDocument.model";
import { ClientDocument } from "../src/models/ClientDocument.model";
import { CaseExpense } from "../src/models/CaseExpense.model";
import { ClientPayment } from "../src/models/ClientPayment.model";
import { CaseEvent } from "../src/models/CaseEvent.model";
import { AuditLog } from "../src/models/AuditLog.model";
import { ASSET_STATUSES } from "../src/constants/asset.const";

describe("Media Cleanup Service", () => {
  const dummyAssetId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("isAssetGenuinelyOrphaned", () => {
    it("should return false if any AssetReference exists", async () => {
      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(1 as never);
      jest.spyOn(User, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      const result = await isAssetGenuinelyOrphaned(dummyAssetId);
      expect(result).toBe(false);
    });

    it("should return false if User signatureAssetId references it", async () => {
      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(0 as never);
      jest.spyOn(User, "exists").mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      const result = await isAssetGenuinelyOrphaned(dummyAssetId);
      expect(result).toBe(false);
    });

    it("should return false if CaseDocument references it", async () => {
      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(0 as never);
      jest.spyOn(User, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      const result = await isAssetGenuinelyOrphaned(dummyAssetId);
      expect(result).toBe(false);
    });

    it("should return true when no collection references the asset", async () => {
      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(0 as never);
      jest.spyOn(User, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      const result = await isAssetGenuinelyOrphaned(dummyAssetId);
      expect(result).toBe(true);
    });
  });

  describe("executeMediaCleanup", () => {
    it("should handle Phase 1 retry, Phase 2 reference purge, and Phase 3 orphan purge", async () => {
      const assetId1 = new mongoose.Types.ObjectId();
      const assetId2 = new mongoose.Types.ObjectId();

      // Phase 1: One pending retry asset
      const pendingAsset = {
        _id: assetId1,
        publicId: "sample_retry_public_id",
        resourceType: "raw",
        status: ASSET_STATUSES.DELETED,
      };

      // Mock Asset.find for Phase 1
      const mockFind = jest.spyOn(Asset, "find");
      mockFind.mockReturnValueOnce({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([pendingAsset]),
        }),
      } as never);

      // Mock Phase 2: One eligible reference
      const eligibleRef = {
        _id: new mongoose.Types.ObjectId(),
        assetId: assetId2,
        originalFileName: "petition.pdf",
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      };

      jest.spyOn(AssetReference, "find").mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([eligibleRef]),
        }),
      } as never);

      jest.spyOn(AssetReference, "findOneAndDelete").mockResolvedValue(eligibleRef as never);
      jest.spyOn(AuditLog.prototype, "save").mockResolvedValue({} as never);

      // Mock Phase 3: candidate assets
      mockFind.mockReturnValueOnce({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: assetId2,
              publicId: "candidate_asset_public_id",
              resourceType: "raw",
              status: ASSET_STATUSES.READY,
              createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            },
          ]),
        }),
      } as never);

      // Mock genuinely orphaned checks
      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(0 as never);
      jest.spyOn(User, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      // Mock Cloudinary destroy
      const mockDestroy = jest.spyOn(cloudinaryService, "deleteFromCloudinary");
      mockDestroy.mockResolvedValue({ result: "ok" });

      // Mock Asset operations
      jest.spyOn(Asset, "deleteOne").mockResolvedValue({ deletedCount: 1 } as never);
      jest.spyOn(Asset, "findOneAndUpdate").mockResolvedValue({
        _id: assetId2,
        publicId: "candidate_asset_public_id",
        resourceType: "raw",
        status: ASSET_STATUSES.DELETED,
      } as never);

      const response = await executeMediaCleanup(50);

      expect(response.success).toBe(true);
      expect(response.job).toBe("cleanup-orphaned-media");
      expect(response.references.deleted).toBe(1);
      expect(response.assets.deleted).toBe(1);
      expect(response.assets.retried).toBe(1);
      expect(response.totalPurgedFromCloudinary).toBe(2);
    });

    it("should retain asset in 'deleted' status if Cloudinary API call fails", async () => {
      const assetId = new mongoose.Types.ObjectId();

      // No Phase 1 retries
      jest.spyOn(Asset, "find").mockReturnValueOnce({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      } as never);

      // No Phase 2 references
      jest.spyOn(AssetReference, "find").mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      } as never);

      // Phase 3: 1 candidate asset
      jest.spyOn(Asset, "find").mockReturnValueOnce({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: assetId,
              publicId: "failed_cloud_asset",
              resourceType: "raw",
              status: ASSET_STATUSES.READY,
              createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
            },
          ]),
        }),
      } as never);

      jest.spyOn(AssetReference, "countDocuments").mockResolvedValue(0 as never);
      jest.spyOn(User, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientDocument, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseExpense, "exists").mockResolvedValue(null as never);
      jest.spyOn(ClientPayment, "exists").mockResolvedValue(null as never);
      jest.spyOn(CaseEvent, "exists").mockResolvedValue(null as never);

      jest.spyOn(Asset, "findOneAndUpdate").mockResolvedValue({
        _id: assetId,
        publicId: "failed_cloud_asset",
        resourceType: "raw",
        status: ASSET_STATUSES.DELETED,
      } as never);

      // Cloudinary destruction fails with network error
      jest.spyOn(cloudinaryService, "deleteFromCloudinary").mockRejectedValue(
        new Error("Cloudinary rate limit exceeded")
      );

      const deleteSpy = jest.spyOn(Asset, "deleteOne");

      const response = await executeMediaCleanup(50);

      expect(response.assets.failed).toBe(1);
      // Ensure Asset record in MongoDB was NOT deleted so it can be retried later
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
