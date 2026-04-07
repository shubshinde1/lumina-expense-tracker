import express from "express";
import { protect, admin } from "../middleware/auth.middleware";
import { 
  getUsers, 
  updateUserRole, 
  deleteUser,
  getGlobalCategories,
  createGlobalCategory,
  deleteGlobalCategory,
  getPlatformStats,
  getAllTransactions,
  getUserAnalytics,
  toggleUserSuspension,
  updateUserPlan,
  resetUserPassword,
  sendBroadcast
} from "../controllers/admin.controller";

const router = express.Router();

// User management routes
router.route("/users").get(protect, admin, getUsers);
router.route("/users/:id").delete(protect, admin, deleteUser);
router.route("/users/:id/role").put(protect, admin, updateUserRole);
router.route("/users/:id/suspend").put(protect, admin, toggleUserSuspension);
router.route("/users/:id/plan").put(protect, admin, updateUserPlan);
router.route("/users/:id/password").put(protect, admin, resetUserPassword);

// Global category management routes
router.route("/categories")
  .get(protect, admin, getGlobalCategories)
  .post(protect, admin, createGlobalCategory);
router.route("/categories/:id").delete(protect, admin, deleteGlobalCategory);

// Platform & Analytics routes
router.route("/stats").get(protect, admin, getPlatformStats);
router.route("/transactions").get(protect, admin, getAllTransactions);
router.route("/users/:id/analytics").get(protect, admin, getUserAnalytics);

export default router;
