import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "../constants/collection.const";
import { ITaskDocument } from "../types/models.types";

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      default: null,
    },
    dueAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      default: "NORMAL",
    },
    status: {
      type: String,
      default: "TODO",
    },
    completedAt: {
      type: Date,
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
    collection: COLLECTIONS.TASKS,
  }
);

taskSchema.index({ deletedAt: 1, createdAt: -1 });
taskSchema.index({ caseId: 1, deletedAt: 1 });
taskSchema.index({ clientId: 1, deletedAt: 1 });

export const Task: Model<ITaskDocument> =
  (mongoose.models[MODELS.TASK] as Model<ITaskDocument>) ||
  mongoose.model<ITaskDocument>(MODELS.TASK, taskSchema, COLLECTIONS.TASKS);

export default Task;
