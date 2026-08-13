import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
  params: any;
  body: any;
  headers: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecret");

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        res.status(401).json({ message: "Not authorized, token failed" });
        return;
      }

      if (user.isSuspended) {
        res.status(403).json({ message: "Your account is suspended. Access denied." });
        return;
      }

      const clientTokenVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
      if (user.tokenVersion !== clientTokenVersion) {
        res.status(401).json({ message: "Session expired or invalid, please log in again" });
        return;
      }

      if (decoded.sessionId) {
        const sessionExists = user.sessions && user.sessions.some((s: any) => s._id === decoded.sessionId);
        if (!sessionExists) {
          res.status(401).json({ message: "Session expired or terminated. Please log in again." });
          return;
        }
        req.user = user;
        req.user.currentSessionId = decoded.sessionId;
      } else {
        req.user = user;
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
