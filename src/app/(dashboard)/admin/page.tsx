import { RubricEditor } from "@/components/admin/RubricEditor";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
          Admin
        </p>
        <h1 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">
          Scoring rubric
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Tune metric weights and grade thresholds to match your investment
          thesis. Every report snapshots the weights it was scored with.
        </p>
      </header>

      <div className="mt-10">
        <RubricEditor />
      </div>
    </div>
  );
}
