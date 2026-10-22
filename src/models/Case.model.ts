import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICaseDocument } from "../types/models.types";

const caseSchema = new Schema<ICaseDocument>(
  {
    internalReference: {
      type: String,
      required: [true, "Internal reference is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    caseNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    filingYear: {
      type: Number,
      default: null,
    },
    title: {
      type: String,
      required: [true, "Case title is required"],
      trim: true,
      maxlength: [250, "Title cannot exceed 250 characters"],
      index: true,
    },
    caseType: {
      type: String,
      default: "CIVIL",
      required: true,
      index: true,
    },
    caseCategory: {
      type: String,
      trim: true,
      default: null,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.COURT,
      required: [true, "Court ID is required"],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      required: [true, "Primary Client ID is required"],
      index: true,
    },
    filingDate: {
      type: Date,
      default: null,
    },
    caseStatus: {
      type: String,
      default: "ACTIVE",
      index: true,
    },
    priority: {
      type: String,
      default: "NORMAL",
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    legalIssues: {
      type: String,
      default: null,
    },
    opposingCounsel: {
      type: String,
      trim: true,
      default: null,
    },
    opposingParties: {
      type: [String],
      default: [],
    },
    nextHearingDate: {
      type: Date,
      default: null,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closureReason: {
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
    collection: COLLECTIONS.CASES,
  }
);

caseSchema.index({ deletedAt: 1, createdAt: -1 });
caseSchema.index({ clientId: 1, deletedAt: 1 });
caseSchema.index({ courtId: 1, deletedAt: 1 });

export const Case: Model<ICaseDocument> =
  (mongoose.models[MODELS.CASE] as Model<ICaseDocument>) ||
  mongoose.model<ICaseDocument>(MODELS.CASE, caseSchema, COLLECTIONS.CASES);

export default Case;
