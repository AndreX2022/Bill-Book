import type { Business, Customer, Item, Invoice } from "./types";
import { getToken, clearToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });
  if (res.status === 401) {
    clearToken();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function qs(params?: Record<string, string>) {
  if (!params) return "";
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  const s = new URLSearchParams(filtered).toString();
  return s ? `?${s}` : "";
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ email: string }>("/api/auth/me"),
  },
  business: {
    get: () => request<Business>("/api/business"),
    update: (data: Partial<Business>) =>
      request<Business>("/api/business", { method: "PUT", body: JSON.stringify(data) }),
  },
  customers: {
    list: (q = "") => request<Customer[]>(`/api/customers${qs({ q })}`),
    get: (id: string) => request<Customer>(`/api/customers/${id}`),
    create: (data: Partial<Customer>) =>
      request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Customer>) =>
      request<Customer>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/customers/${id}`, { method: "DELETE" }),
  },
  items: {
    list: (q = "") => request<Item[]>(`/api/items${qs({ q })}`),
    get: (id: string) => request<Item>(`/api/items/${id}`),
    create: (data: Partial<Item>) =>
      request<Item>("/api/items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Item>) =>
      request<Item>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/items/${id}`, { method: "DELETE" }),
  },
  invoices: {
    list: (params?: Record<string, string>) => request<Invoice[]>(`/api/invoices${qs(params)}`),
    get: (id: string) => request<Invoice>(`/api/invoices/${id}`),
    create: (data: unknown) =>
      request<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
    setStatus: (id: string, status: string) =>
      request<Invoice>(`/api/invoices/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    addPayment: (id: string, data: unknown) =>
      request(`/api/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),
    cancel: (id: string) => request<void>(`/api/invoices/${id}`, { method: "DELETE" }),
  },
  reports: {
    salesSummary: (params?: Record<string, string>) =>
      request<{
        invoiceCount: number;
        totalSales: number;
        totalTax: number;
        totalCollected: number;
        totalOutstanding: number;
      }>(`/api/reports/sales-summary${qs(params)}`),
    gstSummary: (params?: Record<string, string>) =>
      request<{
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        invoices: Array<{
          number: string;
          date: string;
          customerName: string;
          customerGstin?: string | null;
          taxableValue: number;
          cgst: number;
          sgst: number;
          igst: number;
          grandTotal: number;
        }>;
      }>(`/api/reports/gst-summary${qs(params)}`),
    stockSummary: () =>
      request<
        Array<{ id: string; name: string; unit: string; stockQty: number; lowStockAt: number; lowStock: boolean }>
      >("/api/reports/stock-summary"),
    outstanding: () =>
      request<
        Array<{
          id: string;
          number: string;
          customerName: string;
          dueDate?: string | null;
          grandTotal: number;
          amountPaid: number;
          due: number;
        }>
      >("/api/reports/outstanding"),
  },
};
