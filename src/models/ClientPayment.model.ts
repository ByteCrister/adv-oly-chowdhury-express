import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { IClientPaymentDocument } from "../types/models.types";

const clientPaymentSchema = new Schema<IClientPaymentDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      required: [true, "Client ID is required"],
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      default: null,
      index: true,
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "BDT",
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      default: "CASH",
      required: true,
      index: true,
    },
    paymentType: {
      type: String,
      default: "CASE_PROFESSIONAL_FEE",
      required: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },
    receiptAssetreferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
      index: true,
    },
    moneyReceiptNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CLIENT_PAYMENTS,
  }
);

clientPaymentSchema.index({ clientId: 1, paymentDate: -1 });
clientPaymentSchema.index({ caseId: 1, paymentDate: -1 });

export const ClientPayment: Model<IClientPaymentDocument> =
  (mongoose.models[MODELS.CLIENT_PAYMENT] as Model<IClientPaymentDocument>) ||
  mongoose.model<IClientPaymentDocument>(
    MODELS.CLIENT_PAYMENT,
    clientPaymentSchema,
    COLLECTIONS.CLIENT_PAYMENTS
  );

export default ClientPayment;
