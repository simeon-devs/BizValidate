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
  const scored = data.filter(
    (v): v is ValidationRow & { score: number } => v.score !== null,
  );
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((sum, v) => sum + v.score, 0) / scored.length)
      : null;
  const latestGraded = data.find((v) => v.grade !== null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Validations"
        value={String(total).padStart(2, "0")}
        meta="All time"
      />
      <StatCard
        label="Average Score"
        value={avg === null ? "—" : String(avg)}
        meta={avg === null ? "No scored runs yet" : "Across scored runs"}
      />
      <StatCard
        label="Latest Grade"
        value={latestGraded?.grade ?? "—"}
        valueColor={
          latestGraded?.grade ? gradeColor(latestGraded.grade) : undefined
        }
        meta={latestGraded ? latestGraded.business : "No graded runs yet"}
      />
    </div>
  );
}
