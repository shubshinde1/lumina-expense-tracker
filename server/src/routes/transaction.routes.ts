import express from "express";
import { protect } from "../middleware/auth.middleware";
import { checkIdempotency } from "../middleware/idempotency.middleware";
import { 
  getDashboardSummary, 
  addTransaction, 
  getTransactions, 
  deleteTransaction, 
  getTransaction, 
  updateTransaction,
  parseNaturalLanguage,
  autoLogSmsTransaction
} from "../controllers/transaction.controller";

const router = express.Router();

router.get("/dashboard", protect, getDashboardSummary);
router.get("/", protect, getTransactions);
router.post("/", protect, checkIdempotency, addTransaction);
router.post("/parse", protect, parseNaturalLanguage);
router.post("/auto-log", protect, checkIdempotency, autoLogSmsTransaction);
router.get("/:id", protect, getTransaction);
router.put("/:id", protect, checkIdempotency, updateTransaction);
router.delete("/:id", protect, checkIdempotency, deleteTransaction);

export default router;
