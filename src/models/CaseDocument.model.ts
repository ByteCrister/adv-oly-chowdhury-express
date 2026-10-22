import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICaseDocumentRecord } from "../types/models.types";

const caseDocumentSchema = new Schema<ICaseDocumentRecord>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    assetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      required: [true, "Asset Reference ID is required"],
      index: true,
    },
    documentType: {
      type: String,
      default: "OTHER",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [200, "Document title cannot exceed 200 characters"],
    },
    documentDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    exhibitNumber: {
      type: String,
      trim: true,
      default: null,
    },
    isConfidential: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_DOCUMENTS,
  }
);

caseDocumentSchema.index({ caseId: 1, deletedAt: 1 });
caseDocumentSchema.index({ assetReferenceId: 1, deletedAt: 1 });
caseDocumentSchema.index({ deletedAt: 1, createdAt: -1 });

export const CaseDocument: Model<ICaseDocumentRecord> =
  (mongoose.models[MODELS.CASE_DOCUMENT] as Model<ICaseDocumentRecord>) ||
  mongoose.model<ICaseDocumentRecord>(
    MODELS.CASE_DOCUMENT,
    caseDocumentSchema,
    COLLECTIONS.CASE_DOCUMENTS
  );

export default CaseDocument;
