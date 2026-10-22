/**
 * TypeScript Types & Interfaces for External Cron Cleanup Endpoints
 */

export interface CronCollectionCleanResult {
  scanned: number;
  eligible: number;
  deleted: number;
  skipped: number;
  failed: number;
}

export interface CronRecordsCleanupResponse {
  success: boolean;
  job: "cleanup-soft-deleted-records";
  retentionCutoff: string; // ISO 8601 UTC string
  processedAt: string; // ISO 8601 UTC string
  batchLimit: number;
  counts: {
    tasks: CronCollectionCleanResult;
    caseDocuments: CronCollectionCleanResult;
    clientDocuments: CronCollectionCleanResult;
    cases: CronCollectionCleanResult;
    clients: CronCollectionCleanResult;
    courts: CronCollectionCleanResult;
  };
  totalScanned: number;
  totalEligible: number;
  totalDeleted: number;
  totalSkipped: number;
  totalFailed: number;
  hasMore: boolean;
  message: string;
}

export interface CronMediaCleanupResponse {
  success: boolean;
  job: "cleanup-orphaned-media";
  retentionCutoff: string; // ISO 8601 UTC string
  processedAt: string; // ISO 8601 UTC string
  batchLimit: number;
  references: {
    scanned: number;
    eligible: number;
    deleted: number;
    skipped: number;
    failed: number;
  };
  assets: {
    retried: number;
    orphansScanned: number;
    eligible: number;
    deleted: number;
    skipped: number;
    failed: number;
  };
  totalPurgedFromCloudinary: number;
  hasMore: boolean;
  message: string;
}

export interface CronLockResult {
  acquired: boolean;
  release: () => Promise<void>;
}
