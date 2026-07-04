import { ValidationForm } from "@/components/validate/ValidationForm";

export default function ValidatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
          New Validation
        </p>
        <h1 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">
          Submit for analysis
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Feed the model your business material. It extracts the signal, scores
          viability across dimensions, and verifies the result.
        </p>
      </header>

      <div className="mt-10">
        <ValidationForm />
      </div>
    </div>
  );
}
