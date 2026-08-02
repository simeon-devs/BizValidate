"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSubmissionStatus } from "@/hooks/useSubmissionStatus";

// Shown while the pipeline is scoring a submission. Polls until the report
// exists, then refreshes the server page so the real report renders.
export function ReportPending({ id, business }: { id: string; business: string }) {
  const router = useRouter();
  const { scored } = useSubmissionStatus(id);

  useEffect(() => {
    if (scored) router.refresh();
  }, [scored, router]);

  return (
    <div className="mx-auto flex min-h-[420px] max-w-5xl flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card/40 px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        Validation in progress
      </p>
      <h1 className="mt-4 max-w-md font-serif text-3xl leading-tight text-foreground text-balance">
        {business}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        The pipeline is extracting facts, gathering market context, and scoring
        each metric. This usually takes about a minute &mdash; the report will
        appear here automatically.
      </p>
      <div className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Scoring
      </div>
    </div>
  );
}
