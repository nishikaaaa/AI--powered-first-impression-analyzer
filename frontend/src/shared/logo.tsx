import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-xs font-semibold text-background">
        FI
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight">
        First Impression
      </span>
    </Link>
  );
}
