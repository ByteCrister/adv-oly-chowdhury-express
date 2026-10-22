import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { IClientDocumentRecord } from "../types/models.types";

const clientDocumentSchema = new Schema<IClientDocumentRecord>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      required: [true, "Client ID is required"],
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
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CLIENT_DOCUMENTS,
  }
);

clientDocumentSchema.index({ clientId: 1, deletedAt: 1 });
clientDocumentSchema.index({ assetReferenceId: 1, deletedAt: 1 });
clientDocumentSchema.index({ deletedAt: 1, createdAt: -1 });

export const ClientDocument: Model<IClientDocumentRecord> =
  (mongoose.models[MODELS.CLIENT_DOCUMENT] as Model<IClientDocumentRecord>) ||
  mongoose.model<IClientDocumentRecord>(
    MODELS.CLIENT_DOCUMENT,
    clientDocumentSchema,
    COLLECTIONS.CLIENT_DOCUMENTS
  );

export default ClientDocument;
