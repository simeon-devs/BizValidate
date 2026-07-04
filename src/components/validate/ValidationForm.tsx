"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputType, BusinessStage } from "@/types/submission";
import { submitValidation } from "@/app/(dashboard)/validate/actions";

const INPUT_TYPES: Array<{ id: InputType; label: string }> = [
  { id: "plan", label: "Business Plan" },
  { id: "pitch", label: "Pitch Deck" },
  { id: "financials", label: "Financials" },
  { id: "idea", label: "Raw Idea" },
];

const STAGES: Array<{ id: BusinessStage; label: string }> = [
  { id: "idea", label: "Idea" },
  { id: "mvp", label: "MVP" },
  { id: "pre-revenue", label: "Pre-Revenue" },
  { id: "early-revenue", label: "Early Revenue" },
  { id: "growth", label: "Growth" },
  { id: "scale", label: "Scale" },
  { id: "established", label: "Established" },
];

const ANALYZE_STEPS = ["Extracting...", "Scoring...", "Verifying..."] as const;

const ACCEPTED = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = ".pdf,.txt,.docx";
const MAX_BYTES = 5 * 1024 * 1024;

type SourceMode = "paste" | "upload";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ValidationForm() {
  const router = useRouter();
  const [inputType, setInputType] = useState<InputType>("plan");
  const [stage, setStage] = useState<BusinessStage>("idea");
  const [sourceMode, setSourceMode] = useState<SourceMode>("paste");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((candidate: File): string | null => {
    const extOk = /\.(pdf|txt|docx)$/i.test(candidate.name);
    if (!ACCEPTED.includes(candidate.type) && !extOk) {
      return "Unsupported file type. Use PDF, TXT, or DOCX.";
    }
    if (candidate.size > MAX_BYTES) {
      return "File exceeds the 5MB limit.";
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const candidate = files[0];
      const error = validateFile(candidate);
      if (error) {
        setFileError(error);
        setFile(null);
        return;
      }
      setFileError(null);
      setFile(candidate);
    },
    [validateFile],
  );

  // Upload submissions unlock when /api/upload lands (BLUEPRINT Phase 2).
  const hasSource = sourceMode === "paste" && pastedText.trim().length > 0;
  const canSubmit = hasSource && !analyzing;

  // Persists the submission; the AI pipeline (BLUEPRINT Phase 3) will pick it
  // up from here. File uploads still need /api/upload — paste-only for now.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setAnalyzing(true);

    const stepTimer = setInterval(
      () => setStepIndex((i) => Math.min(i + 1, ANALYZE_STEPS.length - 1)),
      1100,
    );

    try {
      const result = await submitValidation({
        inputType,
        stage,
        text: pastedText,
        targetRegion: region.trim() || undefined,
      });

      if (result.ok) {
        router.push("/");
        return;
      }
      setSubmitError(result.error);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      clearInterval(stepTimer);
      setAnalyzing(false);
      setStepIndex(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 pb-28">
      {/* 1. Input type — segmented control */}
      <section className="flex flex-col gap-3">
        <FieldLabel index="01" required>
          Input type
        </FieldLabel>
        <div
          role="tablist"
          aria-label="Input type"
          className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 sm:grid-cols-4"
        >
          {INPUT_TYPES.map((t) => {
            const active = inputType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setInputType(t.id)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-input hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Stage selector — pill group */}
      <section className="flex flex-col gap-3">
        <FieldLabel index="02" required>
          Stage
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => {
            const active = stage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStage(s.id)}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent text-accent"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Source — paste vs upload */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <FieldLabel index="03" required>
            Source material
          </FieldLabel>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["paste", "upload"] as const).map((mode) => {
              const active = sourceMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSourceMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                    active
                      ? "bg-input text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "paste" ? "Paste text" : "Upload file"}
                </button>
              );
            })}
          </div>
        </div>

        {sourceMode === "paste" ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your business plan, pitch, financials, or idea here..."
              rows={12}
              className="w-full resize-y rounded-xl border border-border bg-input px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none"
            />
            <p className="text-right font-mono text-xs text-subtle-foreground">
              {pastedText.trim().length} chars
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-accent" />
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{file.name}</span>
                    <span className="font-mono text-xs text-subtle-foreground">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Remove file"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-border-strong bg-surface hover:border-border-strong",
                )}
              >
                <Upload
                  className={cn(
                    "size-6 transition-colors",
                    dragOver ? "text-accent" : "text-muted-foreground",
                  )}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-foreground">
                    Drag &amp; drop or <span className="text-accent">browse</span>
                  </span>
                  <span className="font-mono text-xs text-subtle-foreground">
                    PDF, TXT, DOCX · 5MB max
                  </span>
                </div>
              </button>
            )}
            {fileError && (
              <p className="text-xs text-danger" role="alert">
                {fileError}
              </p>
            )}
            <p className="font-mono text-xs text-subtle-foreground">
              File analysis is coming soon — paste your text to run a
              validation today.
            </p>
          </div>
        )}
      </section>

      {/* 4. Target region (optional) */}
      <section className="flex flex-col gap-3">
        <FieldLabel index="04">Target region</FieldLabel>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. North America, EU, Southeast Asia"
          className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-border-strong focus:outline-none"
        />
      </section>

      {/* 5. Analyze — pinned */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:left-60">
        <div className="mx-auto max-w-2xl px-4 py-4 md:px-8">
          {submitError && (
            <p className="mb-2 text-center text-xs text-danger" role="alert">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition-colors",
              canSubmit
                ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                : "cursor-not-allowed bg-input text-subtle-foreground",
            )}
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span className="font-mono">{ANALYZE_STEPS[stepIndex]}</span>
              </>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function FieldLabel({
  index,
  required,
  children,
}: {
  index: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-xs text-subtle-foreground">{index}</span>
      <span className="text-sm font-medium text-foreground">{children}</span>
      {required && (
        <span className="font-mono text-xs text-accent" aria-hidden>
          *
        </span>
      )}
    </div>
  );
}
