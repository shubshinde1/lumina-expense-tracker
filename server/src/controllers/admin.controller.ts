import mongoose from "mongoose";
import { Response } from "express";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { AuthRequest } from "../middleware/auth.middleware";

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
// @desc    Get all users with transaction counts
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "user",
          as: "transactions"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          transactionCount: { $size: "$transactions" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
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

// @desc    Get platform stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getPlatformStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const volumeStats = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    volumeStats.forEach(stat => {
      if (stat._id === 'income') totalIncome = stat.total;
      if (stat._id === 'expense') totalExpense = stat.total;
    });

    const recentActivity = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate('category', 'name icon color');

    res.json({
      totalUsers,
      totalTransactions,
      totalIncome,
      totalExpense,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all transactions across platform
// @route   GET /api/admin/transactions
// @access  Private/Admin
export const getAllTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .populate('user', 'name email')
      .populate('category', 'name icon color');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get user-specific analytics
// @route   GET /api/admin/users/:id/analytics
// @access  Private/Admin
export const getUserAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.id);

    // Monthly Trends (Last 6 months)
    const monthlyTrends = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ]);

    // Category Distribution
    const categoryDistribution = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense' } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          name: "$category.name",
          color: "$category.color",
          total: 1
        }
      }
    ]);

    // Full transaction history for this user
    const history = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .populate('category', 'name icon color');

    res.json({
      monthlyTrends,
      categoryDistribution,
      history
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
