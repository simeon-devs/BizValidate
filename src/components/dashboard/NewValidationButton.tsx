import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewValidationButton({ className }: { className?: string }) {
  return (
    <Link
      href="/validate"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <Plus className="size-4" />
      New Validation
    </Link>
  );
}
