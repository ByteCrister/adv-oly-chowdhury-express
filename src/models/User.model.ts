import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { IUserDocument } from "../types/models.types";

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
    preferredName: {
      type: String,
      trim: true,
      default: "Advocate Oly Chowdhury",
    },
    title: {
      type: String,
      trim: true,
      default: "Advocate",
    },
    subtitle: {
      type: String,
      trim: true,
      default: "Advocate • Judge's Court, Sylhet",
    },
    tagline: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    status: {
      type: String,
      default: "ACTIVE",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    barCouncilId: {
      type: String,
      trim: true,
      default: null,
    },
    barAssociationMemberNo: {
      type: String,
      trim: true,
      default: null,
    },
    taxesBarMemberNo: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: "01712-459840",
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: "+8801712459840",
    },
    profileAssetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
    },
    signatureAssetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      default: null,
    },
    signatureAssetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
  }
);

userSchema.index({ signatureAssetId: 1 });

export const User: Model<IUserDocument> =
  (mongoose.models[MODELS.USER] as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>(MODELS.USER, userSchema, COLLECTIONS.USERS);

export default User;
