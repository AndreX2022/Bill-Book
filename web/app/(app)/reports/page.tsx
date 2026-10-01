"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<Awaited<ReturnType<typeof api.reports.salesSummary>> | null>(null);
  const [gst, setGst] = useState<Awaited<ReturnType<typeof api.reports.gstSummary>> | null>(null);
  const [stock, setStock] = useState<Awaited<ReturnType<typeof api.reports.stockSummary>>>([]);
  const [outstanding, setOutstanding] = useState<Awaited<ReturnType<typeof api.reports.outstanding>>>([]);

  function loadDateRanged() {
    setLoading(true);
    const params = { from, to };
    Promise.all([api.reports.salesSummary(params), api.reports.gstSummary(params)])
      .then(([s, g]) => {
        setSales(s);
        setGst(g);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDateRanged();
    api.reports.stockSummary().then(setStock).catch((e) => setError(e.message));
    api.reports.outstanding().then(setOutstanding).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStock = stock.filter((s) => s.lowStock);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-ink-light">Sales, tax, stock and dues.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadDateRanged();
        }}
        className="flex flex-wrap items-end gap-3 rounded border border-paper-border bg-paper-card p-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-paper-border bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-paper-border bg-white px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">
          Apply
        </button>
        <span className="text-sm text-ink-light">Applies to sales and GST below. Stock and dues are always current.</span>
      </form>

      {error && <p className="text-sm text-stamp-red">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">Sales summary</h2>
        {loading || !sales ? (
          <p className="text-sm text-ink-light">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Invoices" value={String(sales.invoiceCount)} />
            <MiniStat label="Total sales" value={formatCurrency(sales.totalSales)} />
            <MiniStat label="Collected" value={formatCurrency(sales.totalCollected)} />
            <MiniStat label="Outstanding" value={formatCurrency(sales.totalOutstanding)} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">GST summary</h2>
          <p className="text-xs text-ink-light">
            Formatted to fill in GSTR-1 by hand on the government portal — this does not file anything for you.
          </p>
        </div>
        {loading || !gst ? (
          <p className="text-sm text-ink-light">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat label="Taxable value" value={formatCurrency(gst.taxableValue)} />
              <MiniStat label="CGST" value={formatCurrency(gst.cgst)} />
              <MiniStat label="SGST" value={formatCurrency(gst.sgst)} />
              <MiniStat label="IGST" value={formatCurrency(gst.igst)} />
            </div>
            <div className="rounded border border-paper-border bg-paper-card overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b-2 border-ink text-left text-ink-light">
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">GSTIN</th>
                    <th className="px-3 py-2 text-right font-medium">Taxable</th>
                    <th className="px-3 py-2 text-right font-medium">CGST</th>
                    <th className="px-3 py-2 text-right font-medium">SGST</th>
                    <th className="px-3 py-2 text-right font-medium">IGST</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {gst.invoices.map((i) => (
                    <tr key={i.number}>
                      <td className="px-3 py-2 font-medium text-ink">{i.number}</td>
                      <td className="px-3 py-2 text-ink-light">{formatDate(i.date)}</td>
                      <td className="px-3 py-2 text-ink-light">{i.customerName}</td>
                      <td className="px-3 py-2 text-ink-light">{i.customerGstin || "—"}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCurrency(i.taxableValue)}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCurrency(i.cgst)}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCurrency(i.sgst)}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCurrency(i.igst)}</td>
                      <td className="px-3 py-2 text-right tabular">{formatCurrency(i.grandTotal)}</td>
                    </tr>
                  ))}
                  {gst.invoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-ink-light">
                        No invoices in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">Stock</h2>
        <div className="rounded border border-paper-border bg-paper-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">On hand</th>
                <th className="px-3 py-2 text-right font-medium">Alert at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {stock.map((s) => (
                <tr key={s.id} className={s.lowStock ? "bg-red-50/50" : undefined}>
                  <td className="px-3 py-2 text-ink">{s.name}</td>
                  <td className={`px-3 py-2 text-right tabular ${s.lowStock ? "text-stamp-red font-medium" : ""}`}>
                    {s.stockQty} {s.unit}
                  </td>
                  <td className="px-3 py-2 text-right tabular text-ink-light">{s.lowStockAt}</td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-ink-light">
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {lowStock.length > 0 && (
          <p className="text-sm text-stamp-red">{lowStock.length} item(s) at or below their alert threshold.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">Outstanding dues</h2>
        <div className="rounded border border-paper-border bg-paper-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-3 py-2 font-medium">Invoice</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Due date</th>
                <th className="px-3 py-2 text-right font-medium">Amount due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {outstanding.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2 font-medium text-ink">{o.number}</td>
                  <td className="px-3 py-2 text-ink-light">{o.customerName}</td>
                  <td className="px-3 py-2 text-ink-light">{o.dueDate ? formatDate(o.dueDate) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{formatCurrency(o.due)}</td>
                </tr>
              ))}
              {outstanding.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-ink-light">
                    Nothing outstanding.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-paper-border bg-paper-card p-3">
      <p className="text-xs text-ink-light">{label}</p>
      <p className="mt-0.5 font-serif text-lg font-semibold text-ink tabular">{value}</p>
    </div>
  );
}
