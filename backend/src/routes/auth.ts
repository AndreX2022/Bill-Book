import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { comparePassword, signToken, verifyToken } from "../lib/auth";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) throw new ApiError(400, "email and password are required");

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new ApiError(401, "Invalid email or password");

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, email: user.email });
  })
);

// Lets a client check a stored token is still valid without touching real data.
authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "Missing auth token");
    try {
      const payload = verifyToken(token);
      res.json({ email: payload.email });
    } catch {
      throw new ApiError(401, "Invalid or expired token");
    }
  })
);
