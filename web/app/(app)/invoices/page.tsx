"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const tabs: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Partially paid", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<InvoiceStatus | "ALL">("ALL");

  useEffect(() => {
    setLoading(true);
    api.invoices
      .list(tab === "ALL" ? undefined : { status: tab })
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-ink-light">Every bill you've raised.</p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          New invoice
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-paper-border">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.value ? "border-ink text-ink" : "border-transparent text-ink-light hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded border border-paper-border bg-paper-card">
        {loading ? (
          <p className="px-4 py-6 text-sm text-ink-light">Loading…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-stamp-red">{error}</p>
        ) : invoices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-light">No invoices in this view.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-paper">
                  <td className="px-4 py-2">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-ink hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-light">{inv.customer.name}</td>
                  <td className="px-4 py-2 text-ink-light">{formatDate(inv.date)}</td>
                  <td className="px-4 py-2 text-ink-light">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                  <td className="px-4 py-2">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-2 text-right tabular">{formatCurrency(inv.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
