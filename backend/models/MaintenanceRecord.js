import mongoose from "mongoose";

const maintenanceRecordSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      unique: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    actionTaken: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    partsUsed: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    resolutionDetails: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

maintenanceRecordSchema.index({ asset: 1 });
maintenanceRecordSchema.index({ technician: 1 });

export default mongoose.model("MaintenanceRecord", maintenanceRecordSchema);
