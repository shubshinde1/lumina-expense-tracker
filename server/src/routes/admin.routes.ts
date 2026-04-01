import express from "express";
import { protect, admin } from "../middleware/auth.middleware";
import { 
  getUsers, 
  updateUserRole, 
  deleteUser,
  getGlobalCategories,
  createGlobalCategory,
  deleteGlobalCategory
} from "../controllers/admin.controller";

const router = express.Router();

// User management routes
router.route("/users").get(protect, admin, getUsers);
router.route("/users/:id").delete(protect, admin, deleteUser);
router.route("/users/:id/role").put(protect, admin, updateUserRole);

// Global category management routes
router.route("/categories")
  .get(protect, admin, getGlobalCategories)
  .post(protect, admin, createGlobalCategory);
router.route("/categories/:id").delete(protect, admin, deleteGlobalCategory);

export default router;
