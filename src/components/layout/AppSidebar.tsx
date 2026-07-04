"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center border-l-2 border-transparent px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-accent text-accent"
                : "text-muted-foreground hover:bg-input hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Wordmark() {
  return (
    <Link
      href="/"
      className="block font-serif text-2xl leading-none tracking-tight text-foreground"
    >
      BizValidate
    </Link>
  );
}

/** Desktop fixed sidebar */
export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Wordmark />
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <NavLinks />
      </div>
      <div className="border-t border-border px-6 py-4">
        <p className="font-mono text-xs text-subtle-foreground">v0.1.0 · beta</p>
      </div>
    </aside>
  );
}
