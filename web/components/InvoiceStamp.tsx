import type { InvoiceStatus } from "@/lib/types";

const stampConfig: Partial<Record<InvoiceStatus, { label: string; color: string }>> = {
  PAID: { label: "Paid", color: "border-stamp-green text-stamp-green" },
  OVERDUE: { label: "Overdue", color: "border-stamp-red text-stamp-red" },
  CANCELLED: { label: "Cancelled", color: "border-ink-light text-ink-light" },
};

export function InvoiceStamp({ status }: { status: InvoiceStatus }) {
  const config = stampConfig[status];
  if (!config) return null;

  return (
    <div
      className={`pointer-events-none select-none rounded border-[3px] px-4 py-1.5 font-serif text-xl font-semibold uppercase tracking-wide opacity-80 ${config.color}`}
      style={{ transform: "rotate(-6deg)" }}
      aria-hidden="true"
    >
      {config.label}
    </div>
  );
}
