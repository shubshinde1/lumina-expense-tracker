import express from "express";
import { protect } from "../middleware/auth.middleware";
import { getDashboardSummary, addTransaction, getTransactions, deleteTransaction, getTransaction, updateTransaction } from "../controllers/transaction.controller";

const router = express.Router();

router.get("/dashboard", protect, getDashboardSummary);
router.get("/", protect, getTransactions);
router.post("/", protect, addTransaction);
router.get("/:id", protect, getTransaction);
router.put("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);

export default router;
