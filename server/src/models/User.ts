import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deviceType: { type: String, enum: ["Mobile", "Tablet", "Desktop"], default: "Desktop" },
  browserName: { type: String, default: "Unknown Browser" },
  os: { type: String, default: "Unknown OS" },
  ip: { type: String, default: "Unknown IP" },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plan: { type: String, enum: ["free", "premium"], default: "free" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuspended: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    sessions: { type: [sessionSchema], default: [] },
    settings: {
      autoOpenKeyboard: { type: Boolean, default: true },
      smsParserActive: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
