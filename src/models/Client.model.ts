import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { IClientDocument } from "../types/models.types";

const clientSchema = new Schema<IClientDocument>(
  {
    clientNumber: {
      type: String,
      required: [true, "Client number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    clientType: {
      type: String,
      default: "INDIVIDUAL",
      required: true,
    },
    status: {
      type: String,
      default: "ACTIVE",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
      index: true,
    },
    organizationName: {
      type: String,
      trim: true,
      default: null,
    },
    fatherOrSpouseName: {
      type: String,
      trim: true,
      default: null,
    },
    motherName: {
      type: String,
      trim: true,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    nationalId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    permanentAddress: {
      type: String,
      trim: true,
      default: null,
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
    collection: COLLECTIONS.CLIENTS,
  }
);

clientSchema.index({ deletedAt: 1, createdAt: -1 });

export const Client: Model<IClientDocument> =
  (mongoose.models[MODELS.CLIENT] as Model<IClientDocument>) ||
  mongoose.model<IClientDocument>(MODELS.CLIENT, clientSchema, COLLECTIONS.CLIENTS);

export default Client;
