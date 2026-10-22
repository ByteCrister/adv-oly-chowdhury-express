import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import {
  AUDIT_ACTION_LIST,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPE_LIST,
} from "../constants/audit-log.const";
import { IAuditLogDocument } from "../types/models.types";

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: AUDIT_ACTION_LIST,
        message: "{VALUE} is not a valid audit action",
      },
      default: AUDIT_ACTIONS.CREATE,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: {
        values: AUDIT_ENTITY_TYPE_LIST,
        message: "{VALUE} is not a valid audit entity type",
      },
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
      index: true,
    },
    oldValues: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: COLLECTIONS.AUDIT_LOGS,
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  (mongoose.models[MODELS.AUDIT_LOG] as Model<IAuditLogDocument>) ||
  mongoose.model<IAuditLogDocument>(
    MODELS.AUDIT_LOG,
    auditLogSchema,
    COLLECTIONS.AUDIT_LOGS
  );

export default AuditLog;
