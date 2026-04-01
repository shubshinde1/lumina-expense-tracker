import { Response } from "express";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { AuthRequest } from "../middleware/auth.middleware";

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    user.role = req.body.role || user.role;
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Cascade delete: remove all user's transactions and categories to prevent orphan data
    await Transaction.deleteMany({ user: req.params.id });
    await Category.deleteMany({ user: req.params.id });
    await user.deleteOne();
    
    res.json({ message: "User and all associated data removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all global categories
// @route   GET /api/admin/categories
// @access  Private/Admin
export const getGlobalCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Category.find({ isGlobal: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Create global category
// @route   POST /api/admin/categories
// @access  Private/Admin
export const createGlobalCategory = async (req: AuthRequest, res: Response) => {
  const { name, icon, color, type } = req.body;

  try {
    const category = new Category({
      name,
      icon,
      color,
      type,
      isGlobal: true,
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete global category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
export const deleteGlobalCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isGlobal: true });
    
    if (!category) {
      res.status(404).json({ message: "Global category not found" });
      return;
    }
    
    await category.deleteOne();
    res.json({ message: "Global category removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
