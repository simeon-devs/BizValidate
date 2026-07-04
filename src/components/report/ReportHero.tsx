import type { SampleReport } from "@/lib/fixtures";
import { INVESTMENT_TIERS } from "@/lib/scoring/tier";
import { gradeColor } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";

export function ReportHero({ report }: { report: SampleReport }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
        <ScoreRing score={report.overallScore} />

        <div className="flex flex-col items-center gap-4 md:items-start">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
            Overall Grade
          </p>
          <div className="flex items-center gap-5">
            <span
              className="font-serif text-8xl leading-none"
              style={{ color: gradeColor(report.grade) }}
            >
              {report.grade}
            </span>
            <div className="max-w-xs border-l border-border-strong pl-5">
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {report.reportData.verdict}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
          Investment Tier
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INVESTMENT_TIERS.map((tier) => {
            const active = tier === report.investmentTier;
            return (
              <div
                key={tier}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  active
                    ? "border-accent bg-surface"
                    : "border-border bg-background",
                )}
              >
                <p
                  className={cn(
                    "text-sm",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {tier}
                </p>
                {active ? (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                    Assigned
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
