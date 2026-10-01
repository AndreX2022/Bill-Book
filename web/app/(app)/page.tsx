"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { Invoice } from "@/lib/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<{ totalSales: number; totalOutstanding: number; invoiceCount: number } | null>(
    null
  );
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recent, setRecent] = useState<Invoice[]>([]);

  useEffect(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    Promise.all([
      api.reports.salesSummary({ from: monthStart.toISOString() }),
      api.reports.stockSummary(),
      api.invoices.list(),
    ])
      .then(([salesSummary, stock, invoices]) => {
        setSales(salesSummary);
        setLowStockCount(stock.filter((s) => s.lowStock).length);
        setRecent(invoices.slice(0, 6));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-light">Loading dashboard…</div>;
  if (error) return <div className="p-6 text-sm text-stamp-red">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-light">This month, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sales this month" value={formatCurrency(sales?.totalSales || 0)} />
        <StatCard label="Invoices this month" value={String(sales?.invoiceCount || 0)} />
        <StatCard
          label="Outstanding"
          value={formatCurrency(sales?.totalOutstanding || 0)}
          tone={sales && sales.totalOutstanding > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Low stock items"
          value={String(lowStockCount)}
          tone={lowStockCount > 0 ? "danger" : "default"}
          hint={lowStockCount > 0 ? "Check Items" : undefined}
        />
      </div>

      <div className="rounded border border-paper-border bg-paper-card">
        <div className="flex items-center justify-between border-b border-paper-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold text-ink">Recent invoices</h2>
          <Link href="/invoices" className="text-sm font-medium text-ink hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-light">
            No invoices yet. <Link href="/invoices/new" className="underline">Create your first one</Link>.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {recent.map((inv) => (
                <tr key={inv.id} className="hover:bg-paper">
                  <td className="px-4 py-2">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-ink hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-light">{inv.customer.name}</td>
                  <td className="px-4 py-2 text-ink-light">{formatDate(inv.date)}</td>
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
