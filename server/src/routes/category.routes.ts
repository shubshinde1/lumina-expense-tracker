import express from "express";
import { protect } from "../middleware/auth.middleware";
import { getCategories, createCategory, updateCategory, deleteCategory, addSubcategory, updateSubcategory, deleteSubcategory } from "../controllers/category.controller";

const router = express.Router();

router.get("/", protect, getCategories);
router.post("/", protect, createCategory);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);

router.post("/:id/subcategories", protect, addSubcategory);
router.put("/:categoryId/subcategories/:subId", protect, updateSubcategory);
router.delete("/:categoryId/subcategories/:subId", protect, deleteSubcategory);

export default router;
