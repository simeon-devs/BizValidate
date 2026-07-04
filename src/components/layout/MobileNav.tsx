"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/validate", label: "New Validation" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
        Menu
      </Button>
      {open && (
        <nav className="absolute left-0 right-0 top-16 z-50 flex flex-col gap-1 border-b border-border-subtle bg-bg-elevated px-5 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-card hover:text-text-primary"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
