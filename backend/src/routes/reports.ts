import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

export const reportsRouter = Router();

function dateRange(req: { query: Record<string, unknown> }) {
  const { from, to } = req.query as Record<string, string>;
  return {
    gte: from ? new Date(from) : undefined,
    lte: to ? new Date(to) : undefined,
  };
}

reportsRouter.get(
  "/sales-summary",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" }, date: dateRange(req) },
    });
    const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalTax = invoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    res.json({
      invoiceCount: invoices.length,
      totalSales,
      totalTax,
      totalCollected,
      totalOutstanding: totalSales - totalCollected,
    });
  })
);

// Formatted to make GSTR-1 filing on the government portal fast to fill in by
// hand - this does not submit anything to GSTN. See README.
reportsRouter.get(
  "/gst-summary",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" }, date: dateRange(req) },
      include: { customer: true },
      orderBy: { date: "asc" },
    });
    res.json({
      taxableValue: invoices.reduce((s, i) => s + i.taxableValue, 0),
      cgst: invoices.reduce((s, i) => s + i.cgst, 0),
      sgst: invoices.reduce((s, i) => s + i.sgst, 0),
      igst: invoices.reduce((s, i) => s + i.igst, 0),
      invoices: invoices.map((i) => ({
        number: i.number,
        date: i.date,
        customerName: i.customer.name,
        customerGstin: i.customer.gstin,
        taxableValue: i.taxableValue,
        cgst: i.cgst,
        sgst: i.sgst,
        igst: i.igst,
        grandTotal: i.grandTotal,
      })),
    });
  })
);

reportsRouter.get(
  "/stock-summary",
  asyncHandler(async (_req, res) => {
    const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
    res.json(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        stockQty: i.stockQty,
        lowStockAt: i.lowStockAt,
        lowStock: i.stockQty <= i.lowStockAt,
      }))
    );
  })
);

reportsRouter.get(
  "/outstanding",
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    });
    res.json(
      invoices.map((i) => ({
        id: i.id,
        number: i.number,
        customerName: i.customer.name,
        dueDate: i.dueDate,
        grandTotal: i.grandTotal,
        amountPaid: i.amountPaid,
        due: i.grandTotal - i.amountPaid,
      }))
    );
  })
);
