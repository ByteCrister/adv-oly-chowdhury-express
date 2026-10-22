import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICaseEventDocument } from "../types/models.types";

const caseEventSchema = new Schema<ICaseEventDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    eventType: {
      type: String,
      default: "OTHER",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Event title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      default: null,
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
    },
    assetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_EVENTS,
  }
);

caseEventSchema.index({ caseId: 1, eventDate: -1 });

export const CaseEvent: Model<ICaseEventDocument> =
  (mongoose.models[MODELS.CASE_EVENT] as Model<ICaseEventDocument>) ||
  mongoose.model<ICaseEventDocument>(
    MODELS.CASE_EVENT,
    caseEventSchema,
    COLLECTIONS.CASE_EVENTS
  );

export default CaseEvent;
