import jwt from "jsonwebtoken";

export const generateToken = (id: string, sessionId: string, tokenVersion: number = 0) => {
  return jwt.sign({ id, sessionId, tokenVersion }, process.env.JWT_SECRET || "fallbacksecret", {
    expiresIn: "30d",
  });
};
