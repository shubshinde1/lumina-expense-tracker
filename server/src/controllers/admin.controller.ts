import mongoose from "mongoose";
import { Response } from "express";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendBroadcastEmail } from "../utils/mailer";

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
    const activeUsers = await User.countDocuments({ isSuspended: false });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });
    const freeUsers = await User.countDocuments({ plan: 'free' });
    const premiumUsers = await User.countDocuments({ plan: 'premium' });

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
      activeUsers,
      suspendedUsers,
      freeUsers,
      premiumUsers,
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

    // Robust user fetch using aggregation (matching the main users list logic)
    const userResult = await User.aggregate([
      { $match: { _id: userId } },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          isSuspended: 1,
          plan: 1
        }
      }
    ]);
    const user = userResult[0] || null;

    res.json({
      user,
      monthlyTrends,
      categoryDistribution,
      history
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Toggle user suspension
// @route   PUT /api/admin/users/:id/suspend
// @access  Private/Admin
export const toggleUserSuspension = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      isSuspended: user.isSuspended,
      message: `User ${user.isSuspended ? 'suspended' : 'activated'} successfully`
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update user plan
// @route   PUT /api/admin/users/:id/plan
// @access  Private/Admin
export const updateUserPlan = async (req: AuthRequest, res: Response) => {
  const { plan } = req.body;
  if (!['free', 'premium'].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan type" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.plan = plan;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      plan: user.plan,
      message: `User plan updated to ${plan}`
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Reset user password
// @route   PUT /api/admin/users/:id/password
// @access  Private/Admin
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "User password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Send broadcast message to all users
// @route   POST /api/admin/broadcast
// @access  Private/Admin
export const sendBroadcast = async (req: AuthRequest, res: Response) => {
  const { subject, message, target } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required" });
  }

  try {
    const filter = target === 'premium' ? { plan: 'premium', isSuspended: false } : { isSuspended: false };
    const users = await User.find(filter).select("email");
    const emails = users.map(u => u.email);

    if (emails.length === 0) {
      return res.status(404).json({ message: "No recipients found for the selected target" });
    }

    await sendBroadcastEmail(emails, subject, message);

    res.json({ message: `Broadcast sent to ${emails.length} users successfully` });
  } catch (error: any) {
    res.status(500).json({ message: "Error sending broadcast: " + error.message });
  }
};
