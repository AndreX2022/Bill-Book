"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Item } from "@/lib/types";

const emptyForm = {
  name: "",
  hsnCode: "",
  unit: "pcs",
  salePrice: "",
  purchasePrice: "",
  gstRate: "18",
  stockQty: "0",
  lowStockAt: "0",
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load(q = "") {
    setLoading(true);
    api.items
      .list(q)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.items.create({
        name: form.name,
        hsnCode: form.hsnCode || undefined,
        unit: form.unit,
        salePrice: Number(form.salePrice),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        gstRate: Number(form.gstRate),
        stockQty: Number(form.stockQty),
        lowStockAt: Number(form.lowStockAt),
      });
      setForm(emptyForm);
      setShowForm(false);
      load(query);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await api.items.remove(id);
    load(query);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Items</h1>
          <p className="text-sm text-ink-light">Products and services you sell.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          {showForm ? "Close" : "Add item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="rounded border border-paper-border bg-paper-card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="HSN/SAC code" value={form.hsnCode} onChange={(v) => setForm({ ...form, hsnCode: v })} />
            <Field label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
            <Field
              label="Sale price (₹)"
              required
              type="number"
              value={form.salePrice}
              onChange={(v) => setForm({ ...form, salePrice: v })}
            />
            <Field
              label="Purchase price (₹)"
              type="number"
              value={form.purchasePrice}
              onChange={(v) => setForm({ ...form, purchasePrice: v })}
            />
            <Field
              label="GST rate (%)"
              type="number"
              value={form.gstRate}
              onChange={(v) => setForm({ ...form, gstRate: v })}
            />
            <Field
              label="Opening stock"
              type="number"
              value={form.stockQty}
              onChange={(v) => setForm({ ...form, stockQty: v })}
            />
            <Field
              label="Low stock alert at"
              type="number"
              value={form.lowStockAt}
              onChange={(v) => setForm({ ...form, lowStockAt: v })}
            />
          </div>
          {error && <p className="text-sm text-stamp-red">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save item"}
          </button>
        </form>
      )}

      <div className="rounded border border-paper-border bg-paper-card">
        {loading ? (
          <p className="px-4 py-6 text-sm text-ink-light">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-light">No items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">HSN/SAC</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">GST%</th>
                <th className="px-4 py-2 text-right font-medium">Stock</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-paper">
                  <td className="px-4 py-2 font-medium text-ink">{it.name}</td>
                  <td className="px-4 py-2 text-ink-light">{it.hsnCode || "—"}</td>
                  <td className="px-4 py-2 text-right tabular">{formatCurrency(it.salePrice)}</td>
                  <td className="px-4 py-2 text-right tabular text-ink-light">{it.gstRate}%</td>
                  <td className={`px-4 py-2 text-right tabular ${it.stockQty <= it.lowStockAt ? "text-stamp-red font-medium" : ""}`}>
                    {it.stockQty} {it.unit}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onDelete(it.id)} className="text-sm text-stamp-red hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {label} {required && <span className="text-stamp-red">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-paper-border bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}
