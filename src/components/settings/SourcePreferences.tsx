"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addSourcePreference,
  removeSourcePreference,
} from "@/app/(dashboard)/settings/actions";
import type { SourcePreferenceKind } from "@/lib/db/queries/sourcePreferences";

export interface SourcePreferenceItem {
  domain: string;
  kind: SourcePreferenceKind;
  label: string | null;
}

const KIND_COPY: Record<
  SourcePreferenceKind,
  { title: string; blurb: string; placeholder: string; empty: string }
> = {
  favorite: {
    title: "Trusted sources",
    blurb:
      "Searched alongside the usual research and shown first when they say something relevant. They never narrow what the system can find on its own.",
    placeholder: "e.g. stats.gov.rw or a full report URL",
    empty: "No trusted sources yet.",
  },
  blocked: {
    title: "Never cite",
    blurb:
      "Domains the analysis must never use as evidence — excluded from search and stripped from every report, including ones served from cache.",
    placeholder: "e.g. example-blog.com",
    empty: "Nothing blocked.",
  },
};

function PreferenceList({
  kind,
  items,
  onChange,
}: {
  kind: SourcePreferenceKind;
  items: SourcePreferenceItem[];
  onChange: (next: SourcePreferenceItem[]) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = KIND_COPY[kind];

  function add() {
    const domain = value.trim();
    if (!domain) return;
    setError(null);
    startTransition(async () => {
      const result = await addSourcePreference({ domain, kind });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Saving a domain already held under the other kind flips it, so
      // drop any prior entry for it before adding the fresh one.
      onChange([
        ...items.filter((i) => i.domain !== result.domain),
        { domain: result.domain, kind, label: null },
      ]);
      setValue("");
    });
  }

  function remove(domain: string) {
    startTransition(async () => {
      const result = await removeSourcePreference({ domain });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(items.filter((i) => i.domain !== domain));
    });
  }

  const own = items
    .filter((i) => i.kind === kind)
    .sort((a, b) => a.domain.localeCompare(b.domain));

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">{copy.title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          {copy.blurb}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={copy.placeholder}
          disabled={pending}
          aria-label={`Add to ${copy.title.toLowerCase()}`}
          className="min-w-0 flex-1 rounded-lg border border-border-strong bg-input px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-input disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      {own.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle-foreground">
          {copy.empty}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {own.map((item) => (
            <li
              key={item.domain}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs",
                kind === "favorite"
                  ? "border-success/40 text-foreground"
                  : "border-danger/40 text-foreground",
              )}
            >
              {item.domain}
              <button
                type="button"
                onClick={() => remove(item.domain)}
                disabled={pending}
                aria-label={`Remove ${item.domain}`}
                className="rounded p-0.5 text-subtle-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Server-rendered initial state comes in as a prop; edits are optimistic
// against the server actions, which revalidate /settings on success.
export function SourcePreferences({
  initial,
}: {
  initial: SourcePreferenceItem[];
}) {
  const [items, setItems] = useState<SourcePreferenceItem[]>(initial);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
          Research sources
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Shape the market research behind your validations. These preferences
          only change what is searched and what may be cited — never how a
          business is scored.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PreferenceList kind="favorite" items={items} onChange={setItems} />
        <PreferenceList kind="blocked" items={items} onChange={setItems} />
      </div>
    </div>
  );
}
