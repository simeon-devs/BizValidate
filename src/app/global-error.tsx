"use client";

import "./globals.css";

// Root-level error boundary: replaces the whole document when the root
// layout itself throws. Deliberately self-contained — no Clerk, no context
// providers — so it can always render (and prerender at build time).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
          Something went wrong
        </p>
        <h1 className="mt-4 max-w-md font-serif text-3xl leading-tight text-foreground text-balance">
          BizValidate hit an unexpected error
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          Try again in a moment. If this keeps happening, come back a bit
          later.
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
      </body>
    </html>
  );
}
