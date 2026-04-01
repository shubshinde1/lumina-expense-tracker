import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: "Wallet" },
    color: { type: String, default: "#6bfe9c" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    isGlobal: { type: Boolean, default: false },
    type: { type: String, enum: ["income", "expense"], required: true },
    subcategories: [subcategorySchema]
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
