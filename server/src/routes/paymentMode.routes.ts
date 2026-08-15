import express from "express";
import { protect } from "../middleware/auth.middleware";
import { checkIdempotency } from "../middleware/idempotency.middleware";
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
router.post("/", protect, checkIdempotency, createPaymentMode);
router.put("/:id", protect, checkIdempotency, updatePaymentMode);
router.delete("/:id", protect, checkIdempotency, deletePaymentMode);

router.post("/:id/subpaymentmodes", protect, checkIdempotency, addSubPaymentMode);
router.put("/:modeId/subpaymentmodes/:subId", protect, checkIdempotency, updateSubPaymentMode);
router.delete("/:modeId/subpaymentmodes/:subId", protect, checkIdempotency, deleteSubPaymentMode);

export default router;
