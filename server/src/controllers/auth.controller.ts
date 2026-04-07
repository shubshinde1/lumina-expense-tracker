import { Request, Response } from "express";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Otp } from "../models/Otp";
import { generateToken } from "../utils/generateToken";
import { sendOtpEmail } from "../utils/mailer";

// Random 6 digit generator helper
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const requestRegisterOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists with this email." });

    // Clean up any old OTPs for this email first
    await Otp.deleteMany({ email, type: "register" });

    const code = generateOtpCode();
    await Otp.create({ email, otp: code, type: "register" });
    await sendOtpEmail(email, code, "register");

    res.status(200).json({ message: "OTP sent successfully to email" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, otp } = req.body;
  if (!otp) return res.status(400).json({ message: "OTP is required for verification" });

  try {
    const validOtp = await Otp.findOne({ email, otp, type: "register" });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });
    await Otp.deleteMany({ email, type: "register" }); // cleanup immediately

    if (user) {
      const defaultCategories = [
        { name: "Vehicle", type: "expense", icon: "directions_car", color: "#f87171", user: user._id, subcategories: [{ name: "Fuel", user: user._id }, { name: "Service", user: user._id }] },
        { name: "Food", type: "expense", icon: "restaurant", color: "#fb923c", user: user._id, subcategories: [{ name: "Groceries", user: user._id }, { name: "Dining Out", user: user._id }] },
        { name: "Bills", type: "expense", icon: "receipt_long", color: "#60a5fa", user: user._id, subcategories: [{ name: "Internet", user: user._id }, { name: "Electricity", user: user._id }] },
        { name: "Travel", type: "expense", icon: "flight_takeoff", color: "#c084fc", user: user._id, subcategories: [{ name: "Flights", user: user._id }, { name: "Hotels", user: user._id }] },
        { name: "Salary", type: "income", icon: "payments", color: "#6bfe9c", user: user._id, subcategories: [{ name: "Main Job", user: user._id }] }
      ];
      await Category.insertMany(defaultCategories);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const requestResetOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found with that email." });

    await Otp.deleteMany({ email, type: "reset" });
    const code = generateOtpCode();
    await Otp.create({ email, otp: code, type: "reset" });
    await sendOtpEmail(email, code, "reset");

    res.status(200).json({ message: "Password reset OTP sent to email" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  
  try {
    const validOtp = await Otp.findOne({ email, otp, type: "reset" });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user found." });

    user.password = newPassword;
    await user.save();
    await Otp.deleteMany({ email, type: "reset" });

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const authUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && (await (user as any).matchPassword(password))) {
      if (user.isSuspended) {
        return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
