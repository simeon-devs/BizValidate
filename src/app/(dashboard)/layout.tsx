import { DesktopSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";

// Everything in this group is per-user and behind Clerk — static prerendering
// at build time is meaningless here (and trips a context bug in the build
// worker on pages that don't touch an auth API themselves).
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="md:pl-60">
        <TopBar />
        <main className="px-4 py-10 md:px-8 md:py-12">{children}</main>
      </div>
    </div>
  );
}
