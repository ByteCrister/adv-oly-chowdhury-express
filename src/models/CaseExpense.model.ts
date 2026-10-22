import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ICaseExpenseDocument } from "../types/models.types";

const caseExpenseSchema = new Schema<ICaseExpenseDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
    },
    expenseDate: {
      type: Date,
      required: [true, "Expense date is required"],
      index: true,
    },
    category: {
      type: String,
      default: "COURT_FEES",
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "BDT",
      trim: true,
      uppercase: true,
    },
    receiptAssetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_EXPENSES,
  }
);

caseExpenseSchema.index({ caseId: 1, expenseDate: -1 });

export const CaseExpense: Model<ICaseExpenseDocument> =
  (mongoose.models[MODELS.CASE_EXPENSE] as Model<ICaseExpenseDocument>) ||
  mongoose.model<ICaseExpenseDocument>(
    MODELS.CASE_EXPENSE,
    caseExpenseSchema,
    COLLECTIONS.CASE_EXPENSES
  );

export default CaseExpense;
