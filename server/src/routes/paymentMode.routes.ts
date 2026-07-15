import express from "express";
import { protect } from "../middleware/auth.middleware";
import { 
  getPaymentModes, 
  createPaymentMode, 
  updatePaymentMode, 
  deletePaymentMode, 
  addSubPaymentMode, 
  updateSubPaymentMode, 
  deleteSubPaymentMode 
} from "../controllers/paymentMode.controller";

const router = express.Router();

router.get("/", protect, getPaymentModes);
router.post("/", protect, createPaymentMode);
router.put("/:id", protect, updatePaymentMode);
router.delete("/:id", protect, deletePaymentMode);

router.post("/:id/subpaymentmodes", protect, addSubPaymentMode);
router.put("/:modeId/subpaymentmodes/:subId", protect, updateSubPaymentMode);
router.delete("/:modeId/subpaymentmodes/:subId", protect, deleteSubPaymentMode);

export default router;
