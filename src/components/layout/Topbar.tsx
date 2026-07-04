import { UserButton } from "@clerk/nextjs";
import { MobileNav } from "./MobileNav";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-subtle px-5 md:px-8">
      <MobileNav />
      <div className="ml-auto flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
}
