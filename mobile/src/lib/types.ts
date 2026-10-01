export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Business {
  id: string;
  name: string;
  gstin?: string | null;
  address?: string | null;
  state: string;
  phone?: string | null;
  email?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  invoicePrefix: string;
  invoiceSeq: number;
}

export interface Customer {
  id: string;
  name: string;
  gstin?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  state: string;
}

export interface Item {
  id: string;
  name: string;
  hsnCode?: string | null;
  unit: string;
  salePrice: number;
  purchasePrice?: number | null;
  gstRate: number;
  stockQty: number;
  lowStockAt: number;
}

export interface InvoiceLineItem {
  id: string;
  itemId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  rate: number;
  discountPct: number;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  mode: string;
  notes?: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate?: string | null;
  status: InvoiceStatus;
  customerId: string;
  customer: Customer;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  notes?: string | null;
  items: InvoiceLineItem[];
  payments: Payment[];
}
