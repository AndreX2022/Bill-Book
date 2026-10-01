"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";

const emptyForm = { name: "", gstin: "", email: "", phone: "", address: "", state: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load(q = "") {
    setLoading(true);
    api.customers
      .list(q)
      .then(setCustomers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.customers.create(form);
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
    if (!confirm("Delete this customer?")) return;
    await api.customers.remove(id);
    load(query);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-ink-light">Billing parties you invoice.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          {showForm ? "Close" : "Add customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="rounded border border-paper-border bg-paper-card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field
              label="State"
              required
              hint="Determines CGST+SGST vs IGST"
              value={form.state}
              onChange={(v) => setForm({ ...form, state: v })}
            />
            <Field label="GSTIN" value={form.gstin} onChange={(v) => setForm({ ...form, gstin: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </div>
          {error && <p className="text-sm text-stamp-red">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save customer"}
          </button>
        </form>
      )}

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers"
          className="w-full max-w-xs rounded border border-paper-border bg-paper-card px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border border-paper-border px-4 py-2 text-sm font-medium text-ink">
          Search
        </button>
      </form>

      <div className="rounded border border-paper-border bg-paper-card">
        {loading ? (
          <p className="px-4 py-6 text-sm text-ink-light">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-light">No customers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-ink-light">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 font-medium">GSTIN</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-2 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-2 text-ink-light">{c.state}</td>
                  <td className="px-4 py-2 text-ink-light">{c.gstin || "—"}</td>
                  <td className="px-4 py-2 text-ink-light">{c.phone || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onDelete(c.id)} className="text-sm text-stamp-red hover:underline">
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {label} {required && <span className="text-stamp-red">*</span>}
      </span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-paper-border bg-white px-3 py-2 text-sm"
      />
      {hint && <span className="mt-1 block text-xs text-ink-light">{hint}</span>}
    </label>
  );
}
