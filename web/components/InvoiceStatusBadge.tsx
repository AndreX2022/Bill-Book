import type { InvoiceStatus } from "@/lib/types";

const styles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-paper text-ink-light border border-paper-border",
  SENT: "bg-blue-50 text-blue-800 border border-blue-100",
  PARTIALLY_PAID: "bg-amber-50 text-stamp-amber border border-amber-100",
  PAID: "bg-emerald-50 text-stamp-green border border-emerald-100",
  OVERDUE: "bg-red-50 text-stamp-red border border-red-100",
  CANCELLED: "bg-paper text-ink-light border border-paper-border line-through",
};

const labels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
