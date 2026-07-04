"use client";

import { useState } from "react";
import Link from "next/link";
import { List, LineChart as LineChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationRow, ValidationStatus } from "@/lib/fixtures";
import { gradeColor, formatDate } from "@/lib/utils/format";
import { ScoreChart } from "@/components/dashboard/ScoreChart";

type View = "list" | "chart";

const STATUS_STYLES: Record<ValidationStatus, string> = {
  Draft: "border-border-strong text-subtle-foreground",
  "In Review": "border-border-stronger text-muted-foreground",
  Validated: "border-border-stronger text-foreground",
  Rejected: "border-border-strong text-subtle-foreground",
};

function HistoryRow({ v }: { v: ValidationRow }) {
  return (
    <Link
      href={`/report/${v.id}`}
      className="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-input/40"
    >
      {/* Business */}
      <div className="col-span-12 sm:col-span-5">
        <p className="text-sm font-semibold text-foreground">{v.business}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {v.type}
        </p>
      </div>

      {/* Score */}
      <div className="col-span-4 sm:col-span-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-subtle-foreground sm:hidden">
          Score
        </p>
        <p className="font-mono text-lg text-foreground">{v.score}</p>
      </div>

      {/* Grade */}
      <div className="col-span-3 sm:col-span-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-subtle-foreground sm:hidden">
          Grade
        </p>
        <p
          className="font-serif text-2xl leading-none"
          style={{ color: gradeColor(v.grade) }}
        >
          {v.grade}
        </p>
      </div>

      {/* Date */}
      <div className="col-span-5 sm:col-span-2">
        <p className="font-mono text-xs text-muted-foreground">
          {formatDate(v.date)}
        </p>
      </div>

      {/* Status badge */}
      <div className="col-span-12 sm:col-span-2 sm:text-right">
        <span
          className={cn(
            "inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em]",
            STATUS_STYLES[v.status],
          )}
        >
          {v.status}
        </span>
      </div>
    </Link>
  );
}

export function HistorySection({ data }: { data: ValidationRow[] }) {
  const [view, setView] = useState<View>("list");

  const toggle = (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {(
        [
          { key: "list", label: "List", icon: List },
          { key: "chart", label: "Trajectory", icon: LineChartIcon },
        ] as const
      ).map(({ key, label, icon: Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
              active
                ? "border-l-2 border-l-accent bg-input text-accent"
                : "text-muted-foreground hover:bg-input hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-foreground">History</h2>
        {toggle}
      </div>

      <div className="mt-5">
        {view === "list" ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Column header (desktop) */}
            <div className="hidden grid-cols-12 gap-4 border-b border-border-strong px-5 py-3 sm:grid">
              <p className="col-span-5 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
                Business
              </p>
              <p className="col-span-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
                Score
              </p>
              <p className="col-span-1 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
                Grade
              </p>
              <p className="col-span-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
                Date
              </p>
              <p className="col-span-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
                Status
              </p>
            </div>
            {data.map((v) => (
              <HistoryRow key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <ScoreChart data={data} />
        )}
      </div>
    </section>
  );
}
