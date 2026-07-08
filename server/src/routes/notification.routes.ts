import express from "express";
import { protect } from "../middleware/auth.middleware";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "../controllers/notification.controller";

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;
