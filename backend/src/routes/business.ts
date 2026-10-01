import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";

export const businessRouter = Router();

// Single Business row per deployment.
businessRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const business = await prisma.business.findFirst();
    if (!business) throw new ApiError(404, "Business profile not set up yet");
    res.json(business);
  })
);

businessRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await prisma.business.findFirst();
    const business = existing
      ? await prisma.business.update({ where: { id: existing.id }, data: req.body })
      : await prisma.business.create({ data: req.body });
    res.json(business);
  })
);
