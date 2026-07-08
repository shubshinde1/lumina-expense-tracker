import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["login", "transaction", "system", "budget"], 
      default: "system" 
    },
    isRead: { type: Boolean, default: false },
    actionUrl: { type: String },
    metadata: { type: Map, of: String }
  },
  { timestamps: true }
);

// Add index to speed up retrieval
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
