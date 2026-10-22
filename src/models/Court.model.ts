import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICourtDocument } from "../types/models.types";

const courtSchema = new Schema<ICourtDocument>(
  {
    name: {
      type: String,
      required: [true, "Court name is required"],
      trim: true,
      maxlength: [200, "Court name cannot exceed 200 characters"],
      index: true,
    },
    courtType: {
      type: String,
      default: "DISTRICT_JUDGE_COURT",
      required: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
      default: "Sylhet",
      index: true,
    },
    division: {
      type: String,
      trim: true,
      default: "Sylhet",
    },
    roomOrHall: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    presidingJudgeTitle: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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
    collection: COLLECTIONS.COURTS,
  }
);

courtSchema.index({ deletedAt: 1, createdAt: -1 });

export const Court: Model<ICourtDocument> =
  (mongoose.models[MODELS.COURT] as Model<ICourtDocument>) ||
  mongoose.model<ICourtDocument>(MODELS.COURT, courtSchema, COLLECTIONS.COURTS);

export default Court;
