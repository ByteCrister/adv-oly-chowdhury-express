import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { IHearingDocument } from "../types/models.types";

const hearingSchema = new Schema<IHearingDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.COURT,
      default: null,
      index: true,
    },
    hearingDate: {
      type: Date,
      required: [true, "Hearing date is required"],
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
      default: null,
    },
    hearingType: {
      type: String,
      trim: true,
      default: null,
    },
    purpose: {
      type: String,
      default: null,
    },
    outcome: {
      type: String,
      default: null,
    },
    nextDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      default: "SCHEDULED",
    },
    adjournmentReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.HEARINGS,
  }
);

hearingSchema.index({ caseId: 1, hearingDate: 1 });
hearingSchema.index({ courtId: 1, hearingDate: 1 });

export const Hearing: Model<IHearingDocument> =
  (mongoose.models[MODELS.HEARING] as Model<IHearingDocument>) ||
  mongoose.model<IHearingDocument>(MODELS.HEARING, hearingSchema, COLLECTIONS.HEARINGS);

export default Hearing;
