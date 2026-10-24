/**
 * Database Collections and Mongoose Model Names Registry.
 * Preserves exact matching with the existing MongoDB database and Next.js models.
 */

export const COLLECTIONS = {
  USERS: "users",
  CLIENTS: "clients",
  COURTS: "courts",
  CASES: "cases",
  CASE_PARTIES: "case_parties",
  HEARINGS: "hearings",
  CASE_EVENTS: "case_events",
  TASKS: "tasks",
  ASSETS: "assets",
  ASSET_REFERENCES: "asset_references",
  CASE_DOCUMENTS: "case_documents",
  CLIENT_DOCUMENTS: "client_documents",
  CASE_EXPENSES: "case_expenses",
  CLIENT_PAYMENTS: "client_payments",
  AUDIT_LOGS: "audit_logs",
  PASSWORD_RESET_REQUESTS: "password_reset_requests",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export const MODELS = {
  USER: "User",
  CLIENT: "Client",
  COURT: "Court",
  CASE: "Case",
  CASE_PARTY: "CaseParty",
  HEARING: "Hearing",
  CASE_EVENT: "CaseEvent",
  TASK: "Task",
  ASSET: "Asset",
  ASSET_REFERENCE: "AssetReference",
  CASE_DOCUMENT: "CaseDocument",
  CLIENT_DOCUMENT: "ClientDocument",
  CASE_EXPENSE: "CaseExpense",
  CLIENT_PAYMENT: "ClientPayment",
  AUDIT_LOG: "AuditLog",
  PASSWORD_RESET_REQUEST: "PasswordResetRequest",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
