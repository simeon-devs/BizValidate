"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { NavLinks, Wordmark } from "@/components/layout/AppSidebar";

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        {/* Left: mobile menu toggle + wordmark (mobile only) */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-input hover:text-foreground"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Wordmark />
        </div>

        {/* Spacer on desktop to push avatar right */}
        <div className="hidden md:block" />

        {/* Right: Clerk user menu */}
        <UserButton />
      </div>

      {/* Mobile nav panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-surface md:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <div className="py-4">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    </header>
  );
}
