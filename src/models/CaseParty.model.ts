import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICasePartyDocument } from "../types/models.types";

const casePartySchema = new Schema<ICasePartyDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      default: null,
    },
    name: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
      maxlength: [200, "Party name cannot exceed 200 characters"],
      index: true,
    },
    partyType: {
      type: String,
      default: "INDIVIDUAL",
      required: true,
    },
    role: {
      type: String,
      default: "PLAINTIFF",
      required: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_PARTIES,
  }
);

casePartySchema.index({ caseId: 1, role: 1 });
casePartySchema.index({ clientId: 1 });

export const CaseParty: Model<ICasePartyDocument> =
  (mongoose.models[MODELS.CASE_PARTY] as Model<ICasePartyDocument>) ||
  mongoose.model<ICasePartyDocument>(
    MODELS.CASE_PARTY,
    casePartySchema,
    COLLECTIONS.CASE_PARTIES
  );

export default CaseParty;
