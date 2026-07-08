import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Notification } from "../models/Notification";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Cap at 50 for performance
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.json({ message: "Notification removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
