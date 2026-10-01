import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";

export const itemsRouter = Router();

itemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const items = await prisma.item.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(items);
  })
);

itemsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, "Item not found");
    res.json(item);
  })
);

itemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, salePrice } = req.body;
    if (!name || salePrice == null) throw new ApiError(400, "name and salePrice are required");
    const item = await prisma.item.create({ data: req.body });
    res.status(201).json(item);
  })
);

itemsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.item.update({ where: { id: req.params.id }, data: req.body });
    res.json(item);
  })
);

itemsRouter.post(
  "/:id/adjust-stock",
  asyncHandler(async (req, res) => {
    const { delta } = req.body as { delta: number };
    if (typeof delta !== "number") throw new ApiError(400, "delta must be a number");
    const item = await prisma.item.update({
      where: { id: req.params.id },
      data: { stockQty: { increment: delta } },
    });
    res.json(item);
  })
);

itemsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
