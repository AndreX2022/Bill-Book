import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { calculateLineItem, sumInvoiceTotals } from "../lib/gst";
import { formatInvoiceNumber } from "../lib/invoiceNumber";

export const invoicesRouter = Router();

interface LineItemInput {
  itemId?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  discountPct?: number;
  gstRate: number;
}

invoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, customerId, from, to } = req.query as Record<string, string>;
    const invoices = await prisma.invoice.findMany({
      where: {
        status: status ? (status as any) : undefined,
        customerId: customerId || undefined,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { customer: true },
      orderBy: { date: "desc" },
    });
    res.json(invoices);
  })
);

invoicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: true, payments: { orderBy: { date: "desc" } } },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");
    res.json(invoice);
  })
);

// All totals are recomputed here from the raw line items - the client's live
// preview is a convenience, never trusted as the source of truth.
invoicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId, dueDate, notes, lineItems, status } = req.body as {
      customerId: string;
      dueDate?: string;
      notes?: string;
      status?: "DRAFT" | "SENT";
      lineItems: LineItemInput[];
    };

    if (!customerId || !lineItems?.length) {
      throw new ApiError(400, "customerId and at least one line item are required");
    }

    const business = await prisma.business.findFirst();
    if (!business) throw new ApiError(400, "Set up your business profile first");

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const computedLines = lineItems.map((li) => {
      if (!li.description || !li.quantity || !li.rate) {
        throw new ApiError(400, "Each line item needs a description, quantity and rate");
      }
      const breakdown = calculateLineItem({
        quantity: li.quantity,
        rate: li.rate,
        discountPercent: li.discountPct || 0,
        gstRate: li.gstRate,
        businessState: business.state,
        customerState: customer.state,
      });
      return { ...li, ...breakdown };
    });

    const totals = sumInvoiceTotals(computedLines);
    const nextSeq = business.invoiceSeq + 1;
    const number = formatInvoiceNumber(business.invoicePrefix, nextSeq);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          number,
          customerId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
          status: status || "DRAFT",
          taxableValue: totals.taxableValue,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          items: {
            create: computedLines.map((l) => ({
              itemId: l.itemId,
              description: l.description,
              hsnCode: l.hsnCode,
              quantity: l.quantity,
              rate: l.rate,
              discountPct: l.discountPct || 0,
              gstRate: l.gstRate,
              taxableValue: l.taxableValue,
              cgst: l.cgst,
              sgst: l.sgst,
              igst: l.igst,
              total: l.total,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      await tx.business.update({ where: { id: business.id }, data: { invoiceSeq: nextSeq } });

      for (const l of computedLines) {
        if (l.itemId) {
          await tx.item.update({
            where: { id: l.itemId },
            data: { stockQty: { decrement: l.quantity } },
          });
        }
      }

      return created;
    });

    res.status(201).json(invoice);
  })
);

invoicesRouter.put(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: status as any },
    });
    res.json(invoice);
  })
);

invoicesRouter.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const { amount, mode, notes, date } = req.body as {
      amount: number;
      mode?: string;
      notes?: string;
      date?: string;
    };
    if (!amount || amount <= 0) throw new ApiError(400, "amount must be greater than 0");

    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const newPaid = invoice.amountPaid + amount;
    const newStatus = newPaid >= invoice.grandTotal ? "PAID" : "PARTIALLY_PAID";

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          mode: mode || "cash",
          notes,
          date: date ? new Date(date) : undefined,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid, status: newStatus as any },
      }),
    ]);

    res.status(201).json(payment);
  })
);

// Soft-cancel rather than a hard delete, so the invoice number and audit trail survive.
invoicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.invoice.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
    res.status(204).send();
  })
);
