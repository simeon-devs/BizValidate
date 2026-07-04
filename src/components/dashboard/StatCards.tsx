import type { ValidationRow } from "@/lib/fixtures";
import { gradeColor } from "@/lib/utils/format";

function StatCard({
  label,
  value,
  meta,
  valueColor,
}: {
  label: string;
  value: string;
  meta?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        {label}
      </p>
      <p
        className="mt-4 font-serif text-5xl leading-none"
        style={{ color: valueColor ?? "var(--foreground)" }}
      >
        {value}
      </p>
      {meta ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">{meta}</p>
      ) : null}
    </div>
  );
}

export function StatCards({ data }: { data: ValidationRow[] }) {
  const total = data.length;
  const avg =
    total > 0
      ? Math.round(data.reduce((sum, v) => sum + v.score, 0) / total)
      : 0;
  const latest = data[0];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Validations"
        value={String(total).padStart(2, "0")}
        meta="All time"
      />
      <StatCard
        label="Average Score"
        value={String(avg)}
        meta="Across all runs"
      />
      <StatCard
        label="Latest Grade"
        value={latest ? latest.grade : "—"}
        valueColor={latest ? gradeColor(latest.grade) : undefined}
        meta={latest ? latest.business : "No runs yet"}
      />
    </div>
  );
}
