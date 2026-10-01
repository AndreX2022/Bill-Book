"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { InvoiceStamp } from "@/components/InvoiceStamp";
import type { Business, Invoice } from "@/lib/types";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.invoices.get(id), api.business.get()])
      .then(([inv, biz]) => {
        setInvoice(inv);
        setBusiness(biz);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await api.invoices.setStatus(id, status);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount) return;
    setBusy(true);
    try {
      await api.invoices.addPayment(id, { amount: Number(paymentAmount), mode: paymentMode });
      setPaymentAmount("");
      setShowPayment(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-ink-light">Loading…</div>;
  if (error || !invoice) return <div className="p-6 text-sm text-stamp-red">{error || "Invoice not found"}</div>;

  const due = invoice.grandTotal - invoice.amountPaid;
  const interState = business ? business.state.trim().toLowerCase() !== invoice.customer.state.trim().toLowerCase() : false;

  const whatsappText = encodeURIComponent(
    `Invoice ${invoice.number} from ${business?.name || ""}\nAmount: ${formatCurrency(invoice.grandTotal)}\n${
      invoice.dueDate ? `Due: ${formatDate(invoice.dueDate)}\n` : ""
    }Please find the PDF attached separately.`
  );
  const whatsappHref = `https://wa.me/${(invoice.customer.phone || "").replace(/\D/g, "")}?text=${whatsappText}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/invoices" className="text-sm text-ink-light hover:underline">
          ← All invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => setShowPayment((s) => !s)}
              className="rounded border border-paper-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
            >
              Record payment
            </button>
          )}
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => setStatus("SENT")}
              disabled={busy}
              className="rounded border border-paper-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
            >
              Mark as sent
            </button>
          )}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-paper-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
          >
            Share on WhatsApp
          </a>
          <button
            onClick={() => window.print()}
            className="rounded bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/90"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {showPayment && (
        <form
          onSubmit={recordPayment}
          className="print:hidden flex flex-wrap items-end gap-3 rounded border border-paper-border bg-paper-card p-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Amount</span>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              max={due}
              className="w-32 rounded border border-paper-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Mode</span>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="rounded border border-paper-border bg-white px-3 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
          >
            Record
          </button>
        </form>
      )}

      <div className="relative rounded border border-paper-border bg-paper-card p-8 print:border-0 print:p-0">
        <div className="absolute right-8 top-8 print:right-0">
          <InvoiceStamp status={invoice.status} />
        </div>

        <div className="flex flex-wrap justify-between gap-6 border-b border-paper-border pb-6">
          <div>
            <p className="font-serif text-xl font-semibold text-ink">{business?.name}</p>
            {business?.gstin && <p className="text-sm text-ink-light">GSTIN: {business.gstin}</p>}
            {business?.address && <p className="text-sm text-ink-light">{business.address}</p>}
            <p className="text-sm text-ink-light">{business?.state}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-lg font-semibold text-ink">Tax Invoice</p>
            <p className="text-sm text-ink-light">{invoice.number}</p>
            <p className="text-sm text-ink-light">Date: {formatDate(invoice.date)}</p>
            {invoice.dueDate && <p className="text-sm text-ink-light">Due: {formatDate(invoice.dueDate)}</p>}
            <div className="mt-1 print:hidden">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="border-b border-paper-border py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-light">Bill to</p>
          <p className="font-medium text-ink">{invoice.customer.name}</p>
          {invoice.customer.gstin && <p className="text-sm text-ink-light">GSTIN: {invoice.customer.gstin}</p>}
          {invoice.customer.address && <p className="text-sm text-ink-light">{invoice.customer.address}</p>}
          <p className="text-sm text-ink-light">{invoice.customer.state}</p>
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b-2 border-ink text-left text-ink-light">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Description</th>
              <th className="py-2 pr-2 font-medium">HSN</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 pr-2 text-right font-medium">Rate</th>
              <th className="py-2 pr-2 text-right font-medium">GST%</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-border">
            {invoice.items.map((li, idx) => (
              <tr key={li.id}>
                <td className="py-2 pr-2 text-ink-light tabular">{idx + 1}</td>
                <td className="py-2 pr-2 text-ink">{li.description}</td>
                <td className="py-2 pr-2 text-ink-light">{li.hsnCode || "—"}</td>
                <td className="py-2 pr-2 text-right tabular">{li.quantity}</td>
                <td className="py-2 pr-2 text-right tabular">{formatCurrency(li.rate)}</td>
                <td className="py-2 pr-2 text-right tabular text-ink-light">{li.gstRate}%</td>
                <td className="py-2 text-right tabular">{formatCurrency(li.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm space-y-1.5">
            <Row label="Taxable value" value={invoice.taxableValue} />
            {interState ? (
              <Row label="IGST" value={invoice.igst} />
            ) : (
              <>
                <Row label="CGST" value={invoice.cgst} />
                <Row label="SGST" value={invoice.sgst} />
              </>
            )}
            <Row label="Round off" value={invoice.roundOff} />
            <div className="border-t border-paper-border pt-1.5">
              <Row label="Grand total" value={invoice.grandTotal} bold />
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <Row label="Paid" value={invoice.amountPaid} />
                <Row label="Balance due" value={due} bold />
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 border-t border-paper-border pt-4 text-sm text-ink-light">
            <p className="font-medium text-ink">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        )}

        {(business?.bankName || business?.bankAccount) && (
          <div className="mt-6 border-t border-paper-border pt-4 text-sm text-ink-light">
            <p className="font-medium text-ink">Payment details</p>
            {business?.bankName && <p>{business.bankName}</p>}
            {business?.bankAccount && <p>A/C {business.bankAccount}</p>}
            {business?.bankIfsc && <p>IFSC {business.bankIfsc}</p>}
          </div>
        )}
      </div>

      {invoice.payments.length > 0 && (
        <div className="print:hidden rounded border border-paper-border bg-paper-card p-4">
          <p className="mb-2 font-serif text-lg font-semibold text-ink">Payments recorded</p>
          <ul className="divide-y divide-paper-border text-sm">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span className="text-ink-light">
                  {formatDate(p.date)} · {p.mode.replace("_", " ")}
                </span>
                <span className="tabular">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-ink" : "text-ink-light"}`}>
      <span>{label}</span>
      <span className="tabular">{formatCurrency(value)}</span>
    </div>
  );
}
