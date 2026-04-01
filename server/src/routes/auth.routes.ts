import express from "express";
import { registerUser, authUser, requestRegisterOtp, requestResetOtp, resetPassword } from "../controllers/auth.controller";

const router = express.Router();

// Registration Flow
router.post("/register/otp", requestRegisterOtp);
router.post("/register", registerUser);

// Password Reset Flow
router.post("/reset/otp", requestResetOtp);
router.post("/reset", resetPassword);

// Login Flow
router.post("/login", authUser);

export default router;
