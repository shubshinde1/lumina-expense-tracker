import express from "express";
import { protect } from "../middleware/auth.middleware";
import { checkIdempotency } from "../middleware/idempotency.middleware";
import { getCategories, createCategory, updateCategory, deleteCategory, addSubcategory, updateSubcategory, deleteSubcategory } from "../controllers/category.controller";

const router = express.Router();

router.get("/", protect, getCategories);
router.post("/", protect, checkIdempotency, createCategory);
router.put("/:id", protect, checkIdempotency, updateCategory);
router.delete("/:id", protect, checkIdempotency, deleteCategory);

router.post("/:id/subcategories", protect, checkIdempotency, addSubcategory);
router.put("/:categoryId/subcategories/:subId", protect, checkIdempotency, updateSubcategory);
router.delete("/:categoryId/subcategories/:subId", protect, checkIdempotency, deleteSubcategory);

export default router;
