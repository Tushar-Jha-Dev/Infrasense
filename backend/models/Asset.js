import mongoose from "mongoose";
import { CATEGORIES } from "../constants/categories.js";

export const ASSET_CONDITIONS = ["Good", "Fair", "Poor"];
export const ASSET_STATUSES = [
  "Operational",
  "Under Maintenance",
  "Out of Service",
];

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    building: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    installationDate: {
      type: Date,
    },
    condition: {
      type: String,
      enum: ASSET_CONDITIONS,
      default: "Good",
    },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: "Operational",
    },
  },
  { timestamps: true }
);

assetSchema.index({ category: 1 });
assetSchema.index({ status: 1 });

export default mongoose.model("Asset", assetSchema);
