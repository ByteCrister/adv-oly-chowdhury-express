# Advocate Oly Chowdhury Chamber Management - Express Cron Cleanup Service

A standalone, production-grade Express.js microservice engineered to execute scheduled cleanup operations for the Advocate Oly Chowdhury Law Chamber management system.

This service independently manages the lifecycle, retention periods, referential integrity, and safe permanent purging of soft-deleted MongoDB documents and unreferenced Cloudinary media assets without depending on Next.js runtime processes.

---

## Table of Contents

1. [Features & Capabilities](#features--capabilities)
2. [Architecture & Directory Structure](#architecture--directory-structure)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Installation & Setup](#installation--setup)
6. [Available Scripts](#available-scripts)
7. [Endpoints & Authentication](#endpoints--authentication)
8. [External Scheduler Configuration](#external-scheduler-configuration)
9. [Cleanup Workflow & Guarantees](#cleanup-workflow--guarantees)
10. [Error Handling, Locks & Recovery](#error-handling-locks--recovery)
11. [Testing](#testing)
12. [Strict Project Boundaries](#strict-project-boundaries)

---

## Features & Capabilities

- **Strict Referential Integrity**: Purges database records in strict topological dependency order (Tasks &rarr; Case Documents &rarr; Client Documents &rarr; Cases &rarr; Clients &rarr; Courts).
- **Exact Calendar-Month Retention**: Implements UTC-based 1-calendar-month retention calculations with month-end date clamping (e.g., March 31 &rarr; February 28/29), preventing JavaScript date overflow bugs.
- **Two-Phase Physical Media Deletion**:
  - Re-attempts destruction for assets previously stuck in `deleted` status.
  - Purges expired soft-deleted `AssetReference` documents.
  - Identifies and verifies genuinely orphaned assets, transitions status to `deleted`, destroys CDN resources in Cloudinary, and removes MongoDB asset documents only after confirmed destruction.
- **Distributed & In-Process Mutual Exclusion**:
  - Leverages Upstash Redis distributed `SET NX EX` lease locks when configured.
  - Automatically falls back to in-process memory locks with automatic TTL expiration.
  - Returns `409 Conflict` if a matching cleanup job is already executing.
- **Timing-Safe Constant-Time Authentication**: Authenticates requests using `crypto.timingSafeEqual` with SHA-256 digests over `Authorization: Bearer <secret>` and `x-cron-secret: <secret>`.
- **Hybrid Transaction Resilience**: Automatically detects whether MongoDB supports multi-document transactions (replica sets / Atlas). On standalone instances (e.g., local development), executes safely with row-level atomic guarantees rather than crashing.
- **Zero-Dependency on Next.js**: Built with Express 4, TypeScript, Mongoose 8, and Zod. Operates 100% independently from the frontend repository.

---

## Architecture & Directory Structure

Follows a clean, modular MVC-inspired service layer architecture:

```text
adv-oly-chowdhury-express/
├── src/
│   ├── app.ts                         # Express application setup, security headers, middleware
│   ├── server.ts                      # Server startup, port listening, graceful shutdown
│   ├── config/
│   │   ├── env.ts                     # Zod-validated environment configuration
│   │   ├── database.ts                # Mongoose connection & transaction capability detector
│   │   ├── cloudinary.ts              # Cloudinary SDK configuration
│   │   └── redis.ts                   # Upstash Redis client configuration & fallback
│   ├── constants/
│   │   ├── collection.const.ts        # Database collection and model names
│   │   ├── asset.const.ts             # Asset statuses, types, resource types
│   │   ├── asset-reference.const.ts   # Owner types, purposes
│   │   ├── audit-log.const.ts         # Audit actions, entity types
│   │   └── cron.const.ts              # Limits, lock names, job names
│   ├── controllers/
│   │   └── cron.controller.ts         # HTTP request/response handlers for cron triggers
│   ├── middleware/
│   │   ├── authenticate-cron.ts       # Timing-safe CRON_SECRET verification
│   │   ├── error-handler.ts           # Centralized exception & Mongoose error handler
│   │   ├── not-found.ts               # 404 unmatched route handler
│   │   └── request-logger.ts          # Safe structured request logging
│   ├── models/                        # Mongoose schemas matching database collections
│   │   ├── Asset.model.ts
│   │   ├── AssetReference.model.ts
│   │   ├── AuditLog.model.ts
│   │   ├── Case.model.ts
│   │   ├── CaseDocument.model.ts
│   │   ├── CaseEvent.model.ts
│   │   ├── CaseExpense.model.ts
│   │   ├── CaseParty.model.ts
│   │   ├── Client.model.ts
│   │   ├── ClientDocument.model.ts
│   │   ├── ClientPayment.model.ts
│   │   ├── Court.model.ts
│   │   ├── Hearing.model.ts
│   │   ├── Task.model.ts
│   │   ├── User.model.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── cron.routes.ts             # /media and /records endpoints
│   │   ├── health.routes.ts           # /health and /ready endpoints
│   │   └── index.ts                   # Router mounting
│   ├── services/
│   │   ├── cloudinary.service.ts      # Cloudinary CDN destroy operations
│   │   ├── media-cleanup.service.ts   # Multi-phase media cleanup workflow
│   │   └── records-cleanup.service.ts # Topological records cleanup workflow
│   ├── types/
│   │   ├── cron.types.ts              # Response interfaces and result types
│   │   ├── audit.types.ts             # Audit payload interfaces
│   │   └── models.types.ts            # Mongoose document types
│   ├── utils/
│   │   ├── api-error.ts               # Custom HTTP API error class
│   │   ├── audit.util.ts              # Audit log writer with credential redaction
│   │   ├── lock.util.ts               # Redis and process lock manager
│   │   ├── logger.util.ts             # Structured logging utility
│   │   ├── retention.util.ts          # UTC 1-month retention calculator
│   │   └── transaction.util.ts        # Resilient transaction executor
│   └── validators/
│       └── cron.validator.ts          # Query parameter schema (?limit=...)
├── tests/                             # Comprehensive test suites
│   ├── auth.test.ts
│   ├── cron.api.test.ts
│   ├── env.test.ts
│   ├── lock.test.ts
│   ├── media-cleanup.test.ts
│   ├── records-cleanup.test.ts
│   └── retention.test.ts
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- **Node.js**: v20.x, v22.x, or v24.x
- **MongoDB**: v6.0+ (standalone or replica set / MongoDB Atlas)
- **Cloudinary Account**: Required for managing digital document assets.
- **Upstash Redis (Optional)**: Optional distributed lock provider across multi-instance server deployments.

---

## Environment Configuration

Copy `.env.example` to `.env` and provide your secrets:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example / Format |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `production` |
| `PORT` | HTTP port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB connection URI string | `mongodb+srv://...` |
| `CRON_SECRET` | Secret token (min 16 chars) for endpoint authentication | `my_secure_random_cron_secret_32_chars` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` |
| `CLOUDINARY_FOLDER_NAME` | Cloudinary root asset folder | `adv-oly-chowdhury` |

### Optional Variables

| Variable | Description | Example / Format |
|---|---|---|
| `CORS_ORIGIN` | Allowed CORS origins | `*` or `https://admin.example.com` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for distributed locks | `https://your-upstash.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST bearer token | `your_upstash_token` |

> [!NOTE]
> Environment variables are validated at startup via Zod. If any required variable is missing or malformed, the process immediately halts with descriptive diagnostics. Secret values are never printed in logs or validation messages.

---

## Installation & Setup

1. **Navigate to the Express project directory**:
   ```bash
   cd F:\g-drive\Projects\adv-oly-chowdhury-express
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify TypeScript compilation**:
   ```bash
   npm run typecheck
   ```

4. **Run the test suite**:
   ```bash
   npm run test
   ```

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Starts server in watch mode via `tsx` |
| `build` | `npm run build` | Cleans `dist/` and compiles TypeScript to CommonJS |
| `start` | `npm start` | Runs the compiled production server from `dist/server.js` |
| `typecheck` | `npm run typecheck` | Typechecks the entire codebase without emitting files |
| `test` | `npm test` | Runs the Jest test suites in-band |
| `test:coverage` | `npm run test:coverage` | Runs Jest with test coverage reporting |

---

## Endpoints & Authentication

All cleanup endpoints accept both `GET` and `POST` methods to support various scheduler webhook engines.

### 1. Media Cleanup Endpoint
- **URL**: `/api/cron/media` or `/cron/media`
- **Method**: `GET` or `POST`
- **Query Parameter**: `?limit=50` (integer between 1 and 100, default: 50)
- **Headers**:
  - `Authorization: Bearer <CRON_SECRET>` **OR**
  - `x-cron-secret: <CRON_SECRET>`

#### Example Response (200 OK)
```json
{
  "success": true,
  "job": "cleanup-orphaned-media",
  "retentionCutoff": "2026-09-22T06:00:00.000Z",
  "processedAt": "2026-10-22T06:00:00.000Z",
  "batchLimit": 50,
  "references": {
    "scanned": 12,
    "eligible": 12,
    "deleted": 12,
    "skipped": 0,
    "failed": 0
  },
  "assets": {
    "retried": 1,
    "orphansScanned": 8,
    "eligible": 5,
    "deleted": 5,
    "skipped": 3,
    "failed": 0
  },
  "totalPurgedFromCloudinary": 6,
  "hasMore": false,
  "message": "Media cleanup completed. 12 references deleted, 5 orphaned assets purged from Cloudinary and MongoDB, 1 retried, 0 failed."
}
```

---

### 2. Records Cleanup Endpoint
- **URL**: `/api/cron/records` or `/cron/records`
- **Method**: `GET` or `POST`
- **Query Parameter**: `?limit=50` (integer between 1 and 100, default: 50)
- **Headers**:
  - `Authorization: Bearer <CRON_SECRET>` **OR**
  - `x-cron-secret: <CRON_SECRET>`

#### Example Response (200 OK)
```json
{
  "success": true,
  "job": "cleanup-soft-deleted-records",
  "retentionCutoff": "2026-09-22T06:00:00.000Z",
  "processedAt": "2026-10-22T06:00:00.000Z",
  "batchLimit": 50,
  "counts": {
    "tasks": { "scanned": 4, "eligible": 4, "deleted": 4, "skipped": 0, "failed": 0 },
    "caseDocuments": { "scanned": 6, "eligible": 6, "deleted": 6, "skipped": 0, "failed": 0 },
    "clientDocuments": { "scanned": 2, "eligible": 2, "deleted": 2, "skipped": 0, "failed": 0 },
    "cases": { "scanned": 1, "eligible": 1, "deleted": 1, "skipped": 0, "failed": 0 },
    "clients": { "scanned": 1, "eligible": 1, "deleted": 1, "skipped": 0, "failed": 0 },
    "courts": { "scanned": 0, "eligible": 0, "deleted": 0, "skipped": 0, "failed": 0 }
  },
  "totalScanned": 14,
  "totalEligible": 14,
  "totalDeleted": 14,
  "totalSkipped": 0,
  "totalFailed": 0,
  "hasMore": false,
  "message": "Database records cleanup completed. 14 permanently deleted, 0 skipped due to dependencies/restoration, 0 failed."
}
```

---

### 3. Health & Readiness Endpoints
- `GET /health`: Returns service status and database connectivity.
- `GET /ready`: Returns `{ "ready": true }` if MongoDB is connected.
- `GET /`: Returns service identity and available endpoints.

---

## External Scheduler Configuration

Configure your external scheduler to invoke each cleanup job on an off-peak recurring schedule (e.g., daily at midnight or 03:00 UTC).

### Example 1: GitHub Actions Scheduled Workflow
```yaml
name: Chamber Scheduled Cleanup
on:
  schedule:
    - cron: '0 3 * * *' # Every day at 03:00 UTC
  workflow_dispatch:

jobs:
  run-cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Media Cleanup
        run: |
          curl -f -s -X POST "https://your-cron-server.example.com/api/cron/media?limit=50" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

      - name: Trigger Records Cleanup
        run: |
          curl -f -s -X POST "https://your-cron-server.example.com/api/cron/records?limit=50" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

### Example 2: Linux / Unix Crontab
```bash
# Run media cleanup every night at 02:00 UTC
0 2 * * * curl -s -X POST "https://your-cron-server.example.com/api/cron/media?limit=50" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cron-media.log 2>&1

# Run database records cleanup every night at 03:00 UTC
0 3 * * * curl -s -X POST "https://your-cron-server.example.com/api/cron/records?limit=50" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cron-records.log 2>&1
```

### Example 3: Vercel Cron / Upstash QStash / Google Cloud Scheduler
- **Target URL**: `https://your-cron-server.example.com/api/cron/records`
- **Method**: `POST`
- **Header**: `Authorization: Bearer <CRON_SECRET>`

---

## Cleanup Workflow & Guarantees

### Media Cleanup Workflow
```
[Start Media Job]
  │
  ├─► [Phase 1: Retry Previous Partial Failures]
  │     └─► Find Asset records stuck in 'deleted' status
  │           └─► Re-verify orphaned status
  │           └─► Call Cloudinary uploader.destroy
  │           └─► On 'ok'/'not found' -> delete Asset document from MongoDB
  │
  ├─► [Phase 2: Permanently Purge Expired AssetReferences]
  │     └─► Find AssetReference where deletedAt <= cutoffDate
  │           └─► Atomically remove reference within transaction
  │           └─► Record immutable AuditLog entry
  │           └─► Collect assetId as candidate for Phase 3
  │
  └─► [Phase 3: Orphan Detection & Safe Cloudinary Purge]
        └─► Find candidate assets (unreferenced & createdAt <= cutoffDate)
              ├─► Verify 1-month retention requirement
              ├─► Pre-check: isAssetGenuinelyOrphaned() across all 8 collections
              ├─► Atomic State Claim: Update status 'ready' -> 'deleted' in MongoDB
              ├─► Post-Claim Double-Check: Ensure no concurrent reference linked
              ├─► Cloudinary Destruction: Call uploader.destroy outside DB transaction
              └─► On CDN Success: Permanently remove Asset document from MongoDB
              └─► On CDN Failure: Leave asset marked 'deleted' for Phase 1 retry
```

### Records Cleanup Workflow
```
[Start Records Job]
  │
  ├─► Phase 1: Tasks (Leaf documents with deletedAt <= cutoffDate)
  ├─► Phase 2: Case Documents (Leaf documents with deletedAt <= cutoffDate)
  ├─► Phase 3: Client Documents (Leaf documents with deletedAt <= cutoffDate)
  ├─► Phase 4: Cases (Aggregate root)
  │     ├─► Guard: CaseDocument count == 0
  │     ├─► Guard: Active Task count == 0
  │     ├─► Cascade Delete: Hearings, CaseEvents, CaseExpenses, CaseParties
  │     ├─► Decouple: ClientPayments (caseId -> null), Tasks (caseId -> null)
  │     ├─► Soft-Delete: Remaining Case-owned AssetReferences
  │     └─► Permanently delete Case record & record AuditLog
  ├─► Phase 5: Clients (Entity root)
  │     ├─► Guard: No linked Cases, Payments, Documents, Active Tasks, Parties
  │     ├─► Soft-Delete: Remaining Client-owned AssetReferences
  │     ├─► Decouple: Task client references
  │     └─► Permanently delete Client record & record AuditLog
  └─► Phase 6: Courts (Chamber registries)
        ├─► Guard: No linked Cases, Hearings, or Active Assets
        └─► Permanently delete Court record & record AuditLog
```

---

## Error Handling, Locks & Recovery

1. **Concurrent Execution Lock**: Every cron trigger acquires a job-specific lock (`media` or `records`). If another worker or instance is actively running the job, the second caller immediately receives `409 Conflict` with `{ "skipped": true }`.
2. **CDN / Network Failures**: Cloudinary destruction is executed outside of MongoDB transactions. If Cloudinary fails due to network outage or rate-limiting:
   - The asset remains marked with `status: "deleted"` in MongoDB.
   - It is not deleted from MongoDB.
   - During the next cron execution, Phase 1 automatically retries Cloudinary destruction.
3. **Graceful Shutdown**: On `SIGTERM` or `SIGINT`, the server stops accepting new HTTP connections, waits up to 15 seconds for active cleanup operations to finish, releases in-process locks, closes the MongoDB connection, and exits cleanly.

---

## Testing

The project includes unit and integration test suites:

```bash
# Run all tests
npm test

# Run tests with coverage output
npm run test:coverage
```

### Coverage Highlights
- **`env.test.ts`**: Verifies schema validation, required fields, secret length, URL validation, and absence of credential leakage in error messages.
- **`auth.test.ts`**: Verifies constant-time comparison, Bearer token extraction, custom header support, 401 on missing/invalid tokens, and 500 when misconfigured.
- **`retention.test.ts`**: Verifies 1-month UTC subtraction, calendar month-end clamping (Feb 28/29, April 30), year wrap-arounds, and millisecond preservation.
- **`lock.test.ts`**: Verifies exclusive acquisition, mutual exclusion, lease release, and multi-job independence.
- **`media-cleanup.test.ts`**: Tests orphan detection across 8 collections, Phase 1 retries, Phase 2 purges, Phase 3 CDN destructions, and error recovery when CDN calls fail.
- **`records-cleanup.test.ts`**: Tests referential integrity guards, cascading child deletion, reference decoupling, and topological ordering.
- **`cron.api.test.ts`**: Full Supertest integration testing of Express routes, query bounds, authentication middleware, and 409 conflict handling.

---

## Strict Project Boundaries

This application is strictly isolated in `F:\g-drive\Projects\adv-oly-chowdhury-express`. It does not modify, import, or alter any file in the primary Next.js application at `F:\g-drive\Projects\adv-oly-chowdhury`.
