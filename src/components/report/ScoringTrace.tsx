import type {
  EnrichmentSource,
  MetricId,
  PipelineStep,
  ReportData,
} from "@/types/report";
import {
  METRIC_LABELS,
  METRIC_ORDER,
  EVIDENCE_LABELS,
} from "@/lib/utils/format";
import { identifyPreset } from "@/lib/scoring/presets";

const STATUS_LABELS: Record<PipelineStep["status"], string> = {
  ran: "Ran",
  skipped: "Skipped",
  cached: "Cached",
  failed: "Failed",
};

const STATUS_STYLES: Record<PipelineStep["status"], string> = {
  ran: "border-success/40 text-success",
  skipped: "border-warning/40 text-warning",
  cached: "border-border-strong text-muted-foreground",
  failed: "border-danger/40 text-danger",
};

function StepRow({ step }: { step: PipelineStep }) {
  return (
    <li className="flex flex-col gap-2 border-t border-border py-4 sm:flex-row sm:gap-6">
      <div className="flex shrink-0 items-center gap-3 sm:w-52">
        <span className="font-mono text-[11px] text-subtle-foreground">
          {String(step.step).padStart(2, "0")}
        </span>
        <span className="text-sm text-foreground">{step.name}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          {step.detail}
        </p>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span
            className={`rounded border px-1.5 py-0.5 ${STATUS_STYLES[step.status]}`}
          >
            {STATUS_LABELS[step.status]}
          </span>
          {step.model ? (
            <span className="text-subtle-foreground">{step.model}</span>
          ) : null}
          <span className="text-subtle-foreground">
            {(step.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </li>
  );
}

function SourceList({ sources }: { sources: EnrichmentSource[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {sources.map((source) => (
        <li key={source.id} className="flex gap-3">
          <span className="shrink-0 font-mono text-[11px] text-subtle-foreground">
            [S{source.id}]
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs leading-relaxed text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
          >
            {source.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

// Per-metric evidence: what each score rests on, and how sure the scorer was.
function EvidenceTable({ data }: { data: ReportData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle-foreground">
            <th className="pb-2 font-normal">Metric</th>
            <th className="pb-2 font-normal">Score</th>
            <th className="pb-2 font-normal">Anchor band</th>
            <th className="pb-2 font-normal">Evidence</th>
            <th className="pb-2 font-normal">Reading</th>
            <th className="pb-2 font-normal">Sources</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_ORDER.map((id: MetricId) => {
            const metric = data.metrics[id];
            return (
              <tr key={id} className="border-t border-border align-top">
                <td className="py-2 pr-4 text-xs text-foreground">
                  {METRIC_LABELS[id]}
                  {metric.rescored ? (
                    <span className="ml-2 font-mono text-[10px] text-warning">
                      re-scored
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-foreground">
                  {metric.score}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                  {metric.anchorBand ?? "—"}
                </td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  {metric.basis ? EVIDENCE_LABELS[metric.basis].label : "—"}
                </td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">
                  {metric.confidence ?? "—"}
                </td>
                <td className="py-2 font-mono text-xs text-muted-foreground">
                  {metric.sourceRefs && metric.sourceRefs.length > 0
                    ? metric.sourceRefs.map((ref) => `[S${ref}]`).join(" ")
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ScoringTrace({
  data,
  promptVersion,
  scorerModel,
  weights,
  fromCache,
}: {
  data: ReportData;
  promptVersion?: string;
  scorerModel?: string;
  weights: Record<MetricId, number>;
  fromCache?: boolean;
}) {
  const trace = data.trace ?? [];
  const sources = data.sources ?? [];
  // Name the rubric from the weights the report was actually scored with,
  // never a hardcoded one — users can pick a preset or customise it.
  const preset = identifyPreset(weights);
  // v1.0 reports predate evidence tracing; say so rather than showing blanks.
  const isLegacy = trace.length === 0;

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-foreground">
            How this score was produced
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every step, every source, and the arithmetic behind the final number.
          </p>
        </div>
        <span className="print-hide shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle-foreground group-open:hidden">
          Show
        </span>
        <span className="print-hide hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle-foreground group-open:inline">
          Hide
        </span>
      </summary>

      <div className="flex flex-col gap-8 border-t border-border p-5 md:p-6">
        {isLegacy ? (
          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            This report was scored before evidence tracing was introduced, so its
            step-by-step record and sources were never captured. Its score is
            unchanged and still attributable to the prompt version below.
          </p>
        ) : (
          <Section title="Pipeline">
            <ol className="flex flex-col">
              {trace.map((step) => (
                <StepRow key={step.step} step={step} />
              ))}
            </ol>
          </Section>
        )}

        <Section title="Evidence per metric">
          <EvidenceTable data={data} />
          <dl className="mt-1 flex flex-col gap-1 text-[11px] leading-snug text-subtle-foreground">
            {(
              Object.keys(EVIDENCE_LABELS) as (keyof typeof EVIDENCE_LABELS)[]
            ).map((basis) => (
              <div key={basis} className="flex gap-2">
                <dt className="w-20 shrink-0 font-mono uppercase tracking-[0.12em]">
                  {EVIDENCE_LABELS[basis].label}
                </dt>
                <dd>{EVIDENCE_LABELS[basis].blurb}</dd>
              </div>
            ))}
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-mono uppercase tracking-[0.12em]">
                Reading
              </dt>
              <dd>
                How clearly the underlying claim was expressed &mdash; not
                whether it is true.
              </dd>
            </div>
          </dl>
        </Section>

        <Section title={`Sources (${sources.length})`}>
          {sources.length > 0 ? (
            <SourceList sources={sources} />
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
              No external sources were retrieved for this report. Scores rest on
              the submission itself, which is why evidence-dependent metrics are
              marked lower confidence.
            </p>
          )}
        </Section>

        <Section title="Provenance">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Rubric</dt>
              <dd className="text-right text-foreground">
                {preset ? preset.name : "Custom weights"}
                {preset ? (
                  <span className="block text-[11px] text-subtle-foreground">
                    {preset.source}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Weights</dt>
              <dd className="text-right font-mono text-foreground">
                {METRIC_ORDER.map((id) => `${id} ${weights[id]}`).join(" · ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Prompt version</dt>
              <dd className="text-right font-mono text-foreground">
                {promptVersion ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Scorer</dt>
              <dd className="text-right font-mono text-foreground">
                {scorerModel ?? "—"} · temp 0.1
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Final score</dt>
              <dd className="text-right text-foreground">
                weighted sum in code
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Result</dt>
              <dd className="text-right text-foreground">
                {fromCache ? "reused from an earlier run" : "scored fresh"}
              </dd>
            </div>
          </dl>
        </Section>
      </div>
    </details>
  );
}
