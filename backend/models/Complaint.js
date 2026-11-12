import mongoose from "mongoose";
import { CATEGORIES } from "../constants/categories.js";
import { COMPLAINT_STATUSES, SEVERITIES } from "../constants/complaints.js";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "Submitted",
    },
    aiAnalysis: {
      category: { type: String, enum: CATEGORIES },
      severity: { type: String, enum: SEVERITIES },
      possibleCauses: [{ type: String, trim: true }],
      source: { type: String, enum: ["llm", "rules"] },
      needsReview: { type: Boolean, default: false },
      analyzedAt: { type: Date },
    },
    confirmedCategory: {
      type: String,
      enum: CATEGORIES,
    },
    confirmedSeverity: {
      type: String,
      enum: SEVERITIES,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },
    assignmentNotes: {
      type: String,
      trim: true,
    },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1 });
complaintSchema.index({ submittedBy: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ asset: 1 });

export default mongoose.model("Complaint", complaintSchema);
