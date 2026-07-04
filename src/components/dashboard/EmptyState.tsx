import { NewValidationButton } from "@/components/dashboard/NewValidationButton";

export function EmptyState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card/40 px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        No validations yet
      </p>
      <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight text-foreground text-balance">
        Run your first validation to see scores here
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        Enter a business idea and market, and BizValidate returns an
        analyst-grade score, letter grade, and a breakdown of the signals behind
        it. Your history and trajectory build from here.
      </p>
      <NewValidationButton className="mt-8" />
    </div>
  );
}
