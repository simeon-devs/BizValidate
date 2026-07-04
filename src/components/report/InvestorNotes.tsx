export function InvestorNotes({ notes }: { notes: string }) {
  return (
    <section className="rounded-xl border border-border-strong bg-surface p-8 md:p-10">
      <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        Investor Notes
      </p>
      <blockquote className="border-l-2 border-accent pl-6">
        <p className="font-serif text-2xl italic leading-relaxed text-foreground text-pretty md:text-3xl">
          {notes}
        </p>
        <footer className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
          — Model-generated investor memo
        </footer>
      </blockquote>
    </section>
  );
}
