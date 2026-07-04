import { DesktopSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";

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
