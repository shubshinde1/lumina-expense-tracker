import { Request, Response } from "express";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Otp } from "../models/Otp";
import { generateToken } from "../utils/generateToken";
import { sendOtpEmail } from "../utils/mailer";
import { Notification } from "../models/Notification";
import { AuthRequest } from "../middleware/auth.middleware";
import { parseUserAgent } from "../utils/userAgent";

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

      const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
      const { deviceType, browserName, os } = parseUserAgent(req.headers["user-agent"]);
      user.sessions.push({
        _id: sessionId,
        deviceType,
        browserName,
        os,
        ip: req.ip || "Unknown IP"
      });
      await user.save();

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        settings: (user as any).settings || { autoOpenKeyboard: true },
        token: generateToken(user._id.toString(), sessionId, user.tokenVersion),
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
  const { email, otp, newPassword, logoutOthers } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp, type: "reset" });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user found." });

    user.password = newPassword;
    if (logoutOthers === true) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.sessions = [] as any;
    }
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

      if (user.sessions && user.sessions.length >= 3) {
        return res.status(400).json({ 
          message: "Login restricted: You have reached the maximum limit of 3 active sessions. Please log out from another device." 
        });
      }

      if (user.role === "admin") {
        await Otp.deleteMany({ email: user.email, type: "login" });
        const code = generateOtpCode();
        await Otp.create({ email: user.email, otp: code, type: "login" });
        await sendOtpEmail(user.email, code, "login");

        return res.status(200).json({
          requiresOtp: true,
          email: user.email,
          message: "A login verification code has been sent to your email."
        });
      }

      const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
      const { deviceType, browserName, os } = parseUserAgent(req.headers["user-agent"]);
      user.sessions.push({
        _id: sessionId,
        deviceType,
        browserName,
        os,
        ip: req.ip || "Unknown IP"
      });
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        settings: (user as any).settings || { autoOpenKeyboard: true },
        token: generateToken(user._id.toString(), sessionId, user.tokenVersion),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyAdminLoginOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP code are required" });
  }

  try {
    const validOtp = await Otp.findOne({ email, otp, type: "login" });
    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please log in again." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    if (user.sessions && user.sessions.length >= 3) {
      return res.status(400).json({ 
        message: "Login restricted: You have reached the maximum limit of 3 active sessions. Please log out from another device." 
      });
    }

    await Otp.deleteMany({ email, type: "login" });

    const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
    const { deviceType, browserName, os } = parseUserAgent(req.headers["user-agent"]);
    user.sessions.push({
      _id: sessionId,
      deviceType,
      browserName,
      os,
      ip: req.ip || "Unknown IP"
    });
    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      settings: (user as any).settings || { autoOpenKeyboard: true },
      token: generateToken(user._id.toString(), sessionId, user.tokenVersion),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserSettings = async (req: AuthRequest, res: Response) => {
  const { autoOpenKeyboard, smsParserActive } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!(user as any).settings) {
      (user as any).settings = { autoOpenKeyboard: true, smsParserActive: true };
    }

    if (autoOpenKeyboard !== undefined) {
      (user as any).settings.autoOpenKeyboard = autoOpenKeyboard;
    }

    if (smsParserActive !== undefined) {
      (user as any).settings.smsParserActive = smsParserActive;
    }

    user.markModified("settings");
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      settings: (user as any).settings,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select("sessions");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const currentSessionId = req.user.currentSessionId;
    const formattedSessions = user.sessions.map((s: any) => ({
      _id: s._id,
      deviceType: s.deviceType,
      browserName: s.browserName,
      os: s.os,
      ip: s.ip,
      createdAt: s.createdAt,
      lastUsed: s.lastUsed,
      isCurrent: s._id === currentSessionId
    }));

    res.json(formattedSessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.sessions = user.sessions.filter((s: any) => s._id !== req.params.id) as any;
    await user.save();
    res.json({ message: "Device session removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllOtherSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const currentSessionId = req.user.currentSessionId;
    user.sessions = user.sessions.filter((s: any) => s._id === currentSessionId) as any;
    await user.save();
    res.json({ message: "All other device sessions terminated" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
