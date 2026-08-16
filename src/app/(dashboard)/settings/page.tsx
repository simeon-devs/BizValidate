import { currentUser } from "@clerk/nextjs/server";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import {
  SourcePreferences,
  type SourcePreferenceItem,
} from "@/components/settings/SourcePreferences";
import { listPreferencesByUser } from "@/lib/db/queries/sourcePreferences";

export default async function SettingsPage() {
  const user = await currentUser();

  // Source preferences are per-user and load from the DB; a failed read
  // degrades to an empty list rather than taking the whole page down.
  let preferences: SourcePreferenceItem[] = [];
  if (user) {
    try {
      const rows = await listPreferencesByUser(user.id);
      preferences = rows.map((r) => ({
        domain: r.domain,
        kind: r.kind as SourcePreferenceItem["kind"],
        label: r.label,
      }));
    } catch (error) {
      console.error("settings: failed to load source preferences", error);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
          Settings
        </p>
        <h1 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">
          Providers &amp; operations
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Manage API keys, monitor service health, simulate costs, and audit
          every model call behind your validations.
        </p>
      </header>

      <div className="mt-10">
        <SourcePreferences initial={preferences} />
      </div>

      <div className="mt-10">
        <SettingsTabs />
      </div>
    </div>
  );
}
