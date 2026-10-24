import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import {
  PASSWORD_RESET_STATUS_LIST,
  PASSWORD_RESET_DELIVERY_STATUS_LIST,
  PASSWORD_RESET_STATUSES,
  PASSWORD_RESET_DELIVERY_STATUSES,
  PASSWORD_RESET_MAX_ATTEMPTS,
} from "../constants/password-reset.const";
import { IPasswordResetRequestDocument } from "../types/models.types";

const passwordResetRequestSchema = new Schema<IPasswordResetRequestDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      required: [true, "User ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpVerifier: {
      type: String,
      required: [true, "OTP verifier is required"],
      select: false,
    },
    salt: {
      type: String,
      required: [true, "Cryptographic salt is required"],
      select: false,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    isConsumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: PASSWORD_RESET_MAX_ATTEMPTS,
    },
    resetTokenVerifier: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: PASSWORD_RESET_DELIVERY_STATUS_LIST,
      default: PASSWORD_RESET_DELIVERY_STATUSES.PENDING,
      index: true,
    },
    deliveryAttempts: {
      type: Number,
      default: 0,
    },
    lastDeliveredAt: {
      type: Date,
      default: null,
    },
    deliveryError: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: PASSWORD_RESET_STATUS_LIST,
      default: PASSWORD_RESET_STATUSES.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.PASSWORD_RESET_REQUESTS,
  }
);

// TTL index to automatically purge expired requests after 2 hours
passwordResetRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7200 });

// Compound indexes for high-frequency queries
passwordResetRequestSchema.index({ email: 1, status: 1 });
passwordResetRequestSchema.index({ userId: 1, status: 1 });

export const PasswordResetRequest: Model<IPasswordResetRequestDocument> =
  (mongoose.models[MODELS.PASSWORD_RESET_REQUEST] as Model<IPasswordResetRequestDocument>) ||
  mongoose.model<IPasswordResetRequestDocument>(
    MODELS.PASSWORD_RESET_REQUEST,
    passwordResetRequestSchema,
    COLLECTIONS.PASSWORD_RESET_REQUESTS
  );

export default PasswordResetRequest;
