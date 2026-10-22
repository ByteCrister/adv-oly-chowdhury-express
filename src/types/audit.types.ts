import { ClientSession, Types } from "mongoose";
import { Request } from "express";
import { AuditAction, AuditEntityType } from "../constants/audit-log.const";

export interface AuditRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export type AuditStatePayload =
  | Record<string, unknown>
  | object
  | null
  | undefined;

export interface RecordAuditLogParams<
  TOld extends object = object,
  TNew extends object = object,
> {
  req?: Request | null;
  userId?: string | Types.ObjectId | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | Types.ObjectId;
  oldValues?: TOld | Record<string, unknown> | null;
  newValues?: TNew | Record<string, unknown> | null;
  description?: string | null;
  session?: ClientSession | null;
}
