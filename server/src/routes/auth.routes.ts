import express from "express";
import { registerUser, authUser, verifyAdminLoginOtp, requestRegisterOtp, requestResetOtp, resetPassword, updateUserSettings } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

// Registration Flow
router.post("/register/otp", requestRegisterOtp);
router.post("/register", registerUser);

// Password Reset Flow
router.post("/reset/otp", requestResetOtp);
router.post("/reset", resetPassword);

// Login Flow
router.post("/login", authUser);
router.post("/login/verify", verifyAdminLoginOtp);

// User settings route
router.put("/settings", protect as any, updateUserSettings);

export default router;
