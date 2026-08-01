"use client";

// Route-group error boundary: any server error inside (dashboard) lands here
// instead of surfacing raw query text or provider messages to the user.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[420px] max-w-6xl flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card/40 px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        Something went wrong
      </p>
      <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight text-foreground text-balance">
        We couldn&apos;t load this page
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        A temporary problem stopped this page from loading. Your data is safe
        &mdash; try again in a moment.
        {error.digest ? (
          <span className="mt-2 block font-mono text-[11px] text-subtle-foreground">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md border border-border-strong bg-card px-5 py-2 text-sm text-foreground transition-colors hover:bg-card/60"
      >
        Try again
      </button>
    </div>
  );
}
