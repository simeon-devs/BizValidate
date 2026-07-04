import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/validate", label: "New Validation" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border-subtle bg-bg-elevated md:flex">
      <div className="px-5 py-6">
        <span className="font-display text-xl text-text-primary">
          BizValidate
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-2.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
