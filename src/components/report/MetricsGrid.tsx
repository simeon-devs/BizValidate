import type { MetricId, MetricScore } from "@/types/report";
import { scoreColor, METRIC_LABELS, METRIC_ORDER } from "@/lib/utils/format";

function MetricCard({
  id,
  metric,
  weight,
}: {
  id: MetricId;
  metric: MetricScore;
  weight: number;
}) {
  const color = scoreColor(metric.score);
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          {METRIC_LABELS[id]}
        </h3>
        <span className="font-mono text-[11px] text-subtle-foreground">
          {weight}%
        </span>
      </div>

      <p className="mt-3 font-mono text-3xl leading-none" style={{ color }}>
        {metric.score}
      </p>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-input">
        <div
          className="h-full"
          style={{ width: `${metric.score}%`, backgroundColor: color }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
        {metric.note}
      </p>
    </div>
  );
}

export function MetricsGrid({
  metrics,
  weights,
}: {
  metrics: Record<MetricId, MetricScore>;
  weights: Record<MetricId, number>;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
          Dimension Scores
        </h2>
        <span className="font-mono text-[11px] text-subtle-foreground">
          {METRIC_ORDER.length} metrics
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_ORDER.map((id) => (
          <MetricCard
            key={id}
            id={id}
            metric={metrics[id]}
            weight={weights[id]}
          />
        ))}
      </div>
    </section>
  );
}
