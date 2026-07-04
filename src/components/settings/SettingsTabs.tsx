"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelTier } from "@/types/config";
import {
  PROVIDERS,
  SAVED_KEYS,
  SERVICE_HEALTH,
  TIER_COST_PER_VALIDATION,
  TIER_NOTES,
  CALL_LOG,
  type ProviderId,
  type HealthStatus,
  type CallStatus,
} from "@/lib/fixtures";

const TABS = ["API Keys", "Health", "Costs", "Call Log"] as const;
type Tab = (typeof TABS)[number];

export function SettingsTabs() {
  const [tab, setTab] = useState<Tab>("API Keys");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "API Keys" && <ApiKeysPanel />}
        {tab === "Health" && <HealthPanel />}
        {tab === "Costs" && <CostsPanel />}
        {tab === "Call Log" && <CallLogPanel />}
      </div>
    </div>
  );
}

/* ---------- Tab 1: API Keys ---------- */

function ApiKeysPanel() {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {PROVIDERS.map((provider) => (
        <ApiKeyRow key={provider.id} providerId={provider.id} />
      ))}
    </div>
  );
}

function ApiKeyRow({ providerId }: { providerId: ProviderId }) {
  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const [value, setValue] = useState(SAVED_KEYS[providerId] ?? "");
  const [reveal, setReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local-only until Phase 7 wires key management to the server.
  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full shrink-0 sm:w-40">
        <div className="text-sm font-semibold text-foreground">
          {provider.name}
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {provider.description}
        </div>
      </div>

      <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-border bg-input">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder={provider.placeholder}
          aria-label={`${provider.name} API key`}
          className="w-full bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide key" : "Show key"}
          className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors",
          saved
            ? "border-accent text-accent"
            : "border-border-strong text-foreground hover:border-accent hover:text-accent",
        )}
      >
        {saved ? (
          <>
            <Check className="size-4" />
            Saved
          </>
        ) : (
          "Save"
        )}
      </button>
    </div>
  );
}

/* ---------- Tab 2: Health ---------- */

const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  healthy: "text-success",
  degraded: "text-warning",
  down: "text-danger",
};

function HealthPanel() {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {SERVICE_HEALTH.map((service) => (
        <div key={service.name} className="flex items-center gap-4 px-4 py-3.5">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              STATUS_COLOR[service.status],
            )}
            aria-hidden
          />
          <div className="flex flex-1 flex-col">
            <span className="text-sm text-foreground">{service.name}</span>
            <span className="font-mono text-xs text-subtle-foreground">
              {service.region}
            </span>
          </div>
          <span
            className={cn(
              "w-20 text-right text-xs font-medium",
              STATUS_TEXT[service.status],
            )}
          >
            {STATUS_LABEL[service.status]}
          </span>
          <span className="w-24 text-right font-mono text-sm tabular-nums text-foreground">
            {service.latencyMs === null ? "—" : `${service.latencyMs} ms`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Tab 3: Costs ---------- */

const TIERS: { id: ModelTier; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "balanced", label: "Balanced" },
  { id: "premium", label: "Premium" },
];

function CostsPanel() {
  const [volume, setVolume] = useState(500);
  const [tier, setTier] = useState<ModelTier>("balanced");

  const perRun = TIER_COST_PER_VALIDATION[tier];
  const monthly = useMemo(() => volume * perRun, [volume, perRun]);
  const perYear = monthly * 12;

  return (
    <div className="max-w-md overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Cost simulator
        </h3>
        <p className="text-xs text-muted-foreground">
          Estimate spend based on expected volume and model tier.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Expected monthly validations
          </span>
          <input
            type="number"
            min={0}
            value={volume}
            onChange={(e) => setVolume(Math.max(0, Number(e.target.value)))}
            className="rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Model tier
          </span>
          <div
            role="radiogroup"
            aria-label="Model tier"
            className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1"
          >
            {TIERS.map((t) => {
              const active = tier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
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
          <span className="font-mono text-xs text-subtle-foreground">
            {TIER_NOTES[tier]} · ${perRun.toFixed(2)}/run
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Estimated monthly
            </span>
            <span className="font-serif text-3xl text-accent">
              ${monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Projected annual
            </span>
            <span className="font-mono text-sm tabular-nums text-foreground">
              ${perYear.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab 4: Call Log ---------- */

const CALL_STATUS_TEXT: Record<CallStatus, string> = {
  success: "text-success",
  error: "text-danger",
  timeout: "text-warning",
};

function CallLogPanel() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Timestamp", "Model", "Step", "Tokens", "Cost", "Status"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {CALL_LOG.map((entry, i) => (
            <tr
              key={i}
              className="border-b border-border transition-colors last:border-0 hover:bg-input/40"
            >
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                {entry.timestamp}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground">
                {entry.model}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-foreground">
                {entry.step}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                {entry.tokens.toLocaleString("en-US")}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                ${entry.cost.toFixed(4)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <span
                  className={cn(
                    "font-mono text-xs uppercase",
                    CALL_STATUS_TEXT[entry.status],
                  )}
                >
                  {entry.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
