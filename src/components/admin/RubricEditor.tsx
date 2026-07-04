"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Grade, MetricId } from "@/types/report";
import type { ModelTier, WeightPresetId } from "@/types/config";
import {
  WEIGHT_PRESETS,
  RECOMMENDED_PRESET,
} from "@/lib/scoring/presets";
import { GRADE_THRESHOLDS } from "@/lib/scoring/grade";
import { METRIC_LABELS, METRIC_ORDER } from "@/lib/utils/format";

const PRESET_IDS = Object.keys(WEIGHT_PRESETS) as WeightPresetId[];
const GRADE_KEYS = Object.keys(GRADE_THRESHOLDS) as Grade[];

const MODEL_TIERS: { id: ModelTier; label: string; note: string }[] = [
  { id: "economy", label: "Economy", note: "Fastest, lowest cost" },
  { id: "balanced", label: "Balanced", note: "Default quality / cost" },
  { id: "premium", label: "Premium", note: "Deepest analysis" },
];

type Weights = Record<MetricId, number>;
type Thresholds = Record<Grade, number>;

// Local state only for now — persisting to admin_configs arrives with the
// server actions in BLUEPRINT Phase 5.
export function RubricEditor() {
  const [activePreset, setActivePreset] = useState<WeightPresetId | "custom">(
    RECOMMENDED_PRESET,
  );
  const [weights, setWeights] = useState<Weights>(() => ({
    ...WEIGHT_PRESETS[RECOMMENDED_PRESET].weights,
  }));
  const [thresholds, setThresholds] = useState<Thresholds>({
    ...GRADE_THRESHOLDS,
  });
  const [modelTier, setModelTier] = useState<ModelTier>("balanced");

  const total = useMemo(
    () => METRIC_ORDER.reduce((sum, key) => sum + (weights[key] || 0), 0),
    [weights],
  );
  const balanced = Math.round(total * 10) / 10 === 100;

  function applyPreset(id: WeightPresetId) {
    setActivePreset(id);
    setWeights({ ...WEIGHT_PRESETS[id].weights });
  }

  function updateWeight(key: MetricId, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setActivePreset("custom");
  }

  function updateThreshold(key: Grade, value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    setThresholds((prev) => ({ ...prev, [key]: clamped }));
  }

  function resetToRecommended() {
    applyPreset(RECOMMENDED_PRESET);
    setThresholds({ ...GRADE_THRESHOLDS });
  }

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* 1. Preset cards */}
      <section className="flex flex-col gap-3">
        <SectionLabel index="01">Rubric preset</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRESET_IDS.map((id) => {
            const preset = WEIGHT_PRESETS[id];
            const active = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => applyPreset(id)}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors",
                  active
                    ? "border-accent"
                    : "border-border hover:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-accent" : "text-foreground",
                  )}
                >
                  {preset.name}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {preset.source}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Weight sliders */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <SectionLabel index="02">Category weights</SectionLabel>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span
              className={cn(
                "font-mono text-lg font-medium tabular-nums",
                balanced ? "text-accent" : "text-danger",
              )}
            >
              {total.toFixed(total % 1 === 0 ? 0 : 1)}%
            </span>
          </div>
        </div>

        {!balanced && (
          <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
            Weights must sum to exactly 100% — currently{" "}
            {total.toFixed(total % 1 === 0 ? 0 : 1)}%.
          </p>
        )}

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {METRIC_ORDER.map((key) => (
            <WeightRow
              key={key}
              label={METRIC_LABELS[key]}
              value={weights[key]}
              onChange={(v) => updateWeight(key, v)}
            />
          ))}
        </div>
      </section>

      {/* 3. Grade thresholds */}
      <section className="flex flex-col gap-4">
        <SectionLabel index="03">Grade thresholds</SectionLabel>
        <p className="text-xs text-muted-foreground">
          Minimum overall score required to earn each grade.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GRADE_KEYS.map((grade) => (
            <div
              key={grade}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
            >
              <label
                htmlFor={`threshold-${grade}`}
                className="font-serif text-xl leading-none text-foreground"
              >
                {grade}
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-border bg-input">
                <input
                  id={`threshold-${grade}`}
                  type="number"
                  min={0}
                  max={100}
                  value={thresholds[grade]}
                  onChange={(e) => updateThreshold(grade, Number(e.target.value))}
                  className="w-full bg-transparent px-3 py-2 font-mono text-sm text-foreground focus:outline-none"
                />
                <span className="px-2 font-mono text-xs text-subtle-foreground">
                  min
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 + 5. Reset + model tier */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={resetToRecommended}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <RotateCcw className="size-4" />
          Reset to Recommended
        </button>

        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">
              Model Tier
            </span>
            <span className="text-xs text-muted-foreground">
              Controls the model used to generate each validation.
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label="Model tier"
            className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1"
          >
            {MODEL_TIERS.map((tier) => {
              const active = modelTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setModelTier(tier.id)}
                  className={cn(
                    "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-input hover:text-foreground",
                  )}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
          <p className="font-mono text-xs text-subtle-foreground">
            {MODEL_TIERS.find((t) => t.id === modelTier)?.note}
          </p>
        </div>
      </section>
    </div>
  );
}

function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <span className="w-28 shrink-0 text-sm text-foreground">{label}</span>
      <input
        type="range"
        min={0}
        max={50}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} weight`}
        className="rubric-slider h-1 w-full cursor-pointer appearance-none rounded-full bg-border-strong"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(value / 50) * 100}%, var(--border-strong) ${(value / 50) * 100}%, var(--border-strong) 100%)`,
        }}
      />
      <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-foreground">
        {value.toFixed(value % 1 === 0 ? 0 : 1)}%
      </span>
    </div>
  );
}

function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-xs text-subtle-foreground">{index}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {children}
      </h2>
    </div>
  );
}
