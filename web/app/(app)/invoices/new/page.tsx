"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { calculateLineItem, sumInvoiceTotals } from "@/lib/gst";
import { formatCurrency } from "@/lib/format";
import type { Business, Customer, Item } from "@/lib/types";

interface LineRow {
  key: string;
  itemId?: string;
  description: string;
  hsnCode: string;
  quantity: string;
  rate: string;
  discountPct: string;
  gstRate: string;
}

function newRow(): LineRow {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    hsnCode: "",
    quantity: "1",
    rate: "",
    discountPct: "0",
    gstRate: "18",
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<LineRow[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.business.get(), api.customers.list(), api.items.list()])
      .then(([b, c, i]) => {
        setBusiness(b);
        setCustomers(c);
        setItems(i);
      })
      .catch((e) => setError(e.message));
  }, []);

  const customer = customers.find((c) => c.id === customerId);

  const computedRows = useMemo(() => {
    if (!business || !customer) return [];
    return rows.map((r) => {
      const quantity = Number(r.quantity) || 0;
      const rate = Number(r.rate) || 0;
      const discountPct = Number(r.discountPct) || 0;
      const gstRate = Number(r.gstRate) || 0;
      const breakdown = calculateLineItem({
        quantity,
        rate,
        discountPercent: discountPct,
        gstRate,
        businessState: business.state,
        customerState: customer.state,
      });
      return { ...r, ...breakdown };
    });
  }, [rows, business, customer]);

  const totals = useMemo(() => sumInvoiceTotals(computedRows), [computedRows]);
  const interState = business && customer ? business.state.trim().toLowerCase() !== customer.state.trim().toLowerCase() : false;

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pickItem(key: string, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      updateRow(key, { itemId: undefined });
      return;
    }
    updateRow(key, {
      itemId: item.id,
      description: item.name,
      hsnCode: item.hsnCode || "",
      rate: String(item.salePrice),
      gstRate: String(item.gstRate),
    });
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  async function save(status: "DRAFT" | "SENT") {
    setError(null);
    if (!customerId) return setError("Choose a customer first");
    if (rows.some((r) => !r.description || !Number(r.quantity) || !Number(r.rate))) {
      return setError("Every line needs a description, quantity and rate");
    }
    setSaving(true);
    try {
      const invoice = await api.invoices.create({
        customerId,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        status,
        lineItems: rows.map((r) => ({
          itemId: r.itemId,
          description: r.description,
          hsnCode: r.hsnCode || undefined,
          quantity: Number(r.quantity),
          rate: Number(r.rate),
          discountPct: Number(r.discountPct) || 0,
          gstRate: Number(r.gstRate) || 0,
        })),
      });
      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">New invoice</h1>
        <p className="text-sm text-ink-light">Totals update as you type.</p>
      </div>

      <div className="rounded border border-paper-border bg-paper-card p-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Customer *</span>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded border border-paper-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded border border-paper-border bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Tax type</span>
          <div className="rounded border border-paper-border bg-paper px-3 py-2 text-sm text-ink-light">
            {customer ? (interState ? "IGST (inter-state)" : "CGST + SGST (same state)") : "Pick a customer"}
          </div>
        </label>
      </div>

      <div className="rounded border border-paper-border bg-paper-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b-2 border-ink text-left text-ink-light">
              <th className="px-3 py-2 font-medium w-8">#</th>
              <th className="px-3 py-2 font-medium">Item / description</th>
              <th className="px-3 py-2 font-medium w-20">Qty</th>
              <th className="px-3 py-2 font-medium w-28">Rate</th>
              <th className="px-3 py-2 font-medium w-20">Disc%</th>
              <th className="px-3 py-2 font-medium w-20">GST%</th>
              <th className="px-3 py-2 text-right font-medium w-28">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-border">
            {computedRows.map((r, idx) => (
              <tr key={r.key}>
                <td className="px-3 py-2 text-ink-light tabular">{idx + 1}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.itemId || ""}
                    onChange={(e) => pickItem(r.key, e.target.value)}
                    className="mb-1 w-full rounded border border-paper-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="">Custom line</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={r.description}
                    onChange={(e) => updateRow(r.key, { description: e.target.value })}
                    placeholder="Description"
                    className="w-full rounded border border-paper-border bg-white px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    className="w-full rounded border border-paper-border bg-white px-2 py-1 text-sm tabular"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.rate}
                    onChange={(e) => updateRow(r.key, { rate: e.target.value })}
                    className="w-full rounded border border-paper-border bg-white px-2 py-1 text-sm tabular"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.discountPct}
                    onChange={(e) => updateRow(r.key, { discountPct: e.target.value })}
                    className="w-full rounded border border-paper-border bg-white px-2 py-1 text-sm tabular"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.gstRate}
                    onChange={(e) => updateRow(r.key, { gstRate: e.target.value })}
                    className="w-full rounded border border-paper-border bg-white px-2 py-1 text-sm tabular"
                  />
                </td>
                <td className="px-3 py-2 text-right tabular">{formatCurrency(r.total || 0)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    aria-label="Remove line"
                    className="text-ink-light hover:text-stamp-red"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-paper-border px-3 py-2">
          <button type="button" onClick={addRow} className="text-sm font-medium text-ink hover:underline">
            + Add line
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-between">
        <label className="block flex-1">
          <span className="mb-1 block text-sm font-medium text-ink">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-paper-border bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="w-full sm:w-64 shrink-0 rounded border border-paper-border bg-paper-card p-4 text-sm space-y-1.5">
          <Row label="Taxable value" value={totals.taxableValue} />
          {interState ? (
            <Row label="IGST" value={totals.igst} />
          ) : (
            <>
              <Row label="CGST" value={totals.cgst} />
              <Row label="SGST" value={totals.sgst} />
            </>
          )}
          <Row label="Round off" value={totals.roundOff} />
          <div className="border-t border-paper-border pt-1.5 mt-1.5">
            <Row label="Grand total" value={totals.grandTotal} bold />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-stamp-red">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => save("DRAFT")}
          disabled={saving}
          className="rounded border border-paper-border px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          onClick={() => save("SENT")}
          disabled={saving}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save and mark sent"}
        </button>
      </div>
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
