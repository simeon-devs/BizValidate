import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default function SettingsPage() {
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
        <SettingsTabs />
      </div>
    </div>
  );
}
