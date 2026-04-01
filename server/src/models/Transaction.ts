import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId }, // Using the subdocument id
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String },
    },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card'], default: 'UPI' },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
