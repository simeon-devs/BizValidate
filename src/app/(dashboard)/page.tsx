import { currentUser } from "@clerk/nextjs/server";
import { StatCards } from "@/components/dashboard/StatCards";
import { HistorySection } from "@/components/dashboard/HistorySection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewValidationButton } from "@/components/dashboard/NewValidationButton";
import { sampleValidations } from "@/lib/fixtures";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await currentUser();
  const data = sampleValidations;
  const hasData = data.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle-foreground">
            Dashboard
          </p>
          <h1 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">
            {greeting()}
            {user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Here&apos;s where your validations stand. Review scores, track your
            trajectory, and start a new run whenever you&apos;re ready.
          </p>
        </div>
        <NewValidationButton className="shrink-0" />
      </header>

      {hasData ? (
        <>
          <div className="mt-10">
            <StatCards data={data} />
          </div>
          <HistorySection data={data} />
        </>
      ) : (
        <div className="mt-10">
          <EmptyState />
        </div>
      )}
    </div>
  );
}
