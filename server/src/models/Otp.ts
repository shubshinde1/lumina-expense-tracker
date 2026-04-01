import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["register", "reset"], required: true },
  createdAt: { type: Date, default: Date.now, expires: 120 } // automatically delete after exactly 2 mins
});

// Compound index just to be clean
otpSchema.index({ email: 1, type: 1 });

export const Otp = mongoose.model("Otp", otpSchema);
