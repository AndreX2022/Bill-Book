export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "warning" ? "text-stamp-amber" : tone === "danger" ? "text-stamp-red" : "text-ink";

  return (
    <div className="rounded border border-paper-border bg-paper-card p-4">
      <p className="text-sm text-ink-light">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-semibold tabular ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-light">{hint}</p>}
    </div>
  );
}
