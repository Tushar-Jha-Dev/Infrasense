import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "dismissed"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

passwordResetRequestSchema.index({ user: 1, status: 1 });

export default mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
