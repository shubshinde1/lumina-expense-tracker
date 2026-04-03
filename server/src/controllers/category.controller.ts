import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Category.find({
      $or: [{ user: req.user._id }, { isGlobal: true }]
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon, color, type } = req.body;
    const category = await Category.create({ name, icon, color, type, user: req.user._id });
    res.status(201).json(category);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body }, { new: true }
    );
    res.json(category);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const txCount = await Transaction.countDocuments({ category: req.params.id });
    if (txCount > 0) {
      return res.status(400).json({ message: `Cannot delete: This category is consumed by ${txCount} transaction record(s).` });
    }
    await Category.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: "Category deleted" });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

// Subcategories
export const addSubcategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if(!category) return res.status(404).json({ message: "Category not found" });
    category.subcategories.push({ name: req.body.name, user: req.user._id });
    await category.save();
    res.status(201).json(category);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const updateSubcategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findOne({ _id: req.params.categoryId, user: req.user._id });
    if(!category) return res.status(404).json({ message: "Category not found" });
    
    const sub = category.subcategories.id(req.params.subId as string) as any;
    if(!sub) return res.status(404).json({ message: "Subcategory not found" });
    
    sub.name = req.body.name;
    await category.save();
    res.json(category);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
}

export const deleteSubcategory = async (req: AuthRequest, res: Response) => {
  try {
    const txCount = await Transaction.countDocuments({ subcategory: req.params.subId });
    if (txCount > 0) {
      return res.status(400).json({ message: `Cannot delete: This subcategory is consumed by ${txCount} transaction record(s).` });
    }
    const category = await Category.findOne({ _id: req.params.categoryId, user: req.user._id }) as any;
    if(!category) return res.status(404).json({ message: "Not found" });
    category.subcategories = category.subcategories.filter((sub: any) => sub._id.toString() !== req.params.subId);
    await category.save();
    res.json(category);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};
