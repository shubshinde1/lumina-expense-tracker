import mongoose from "mongoose";

const subPaymentModeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const paymentModeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    isGlobal: { type: Boolean, default: false },
    subPaymentModes: [subPaymentModeSchema]
  },
  { timestamps: true }
);

export const PaymentMode = mongoose.model("PaymentMode", paymentModeSchema);
