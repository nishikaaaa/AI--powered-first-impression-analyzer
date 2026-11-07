import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-12",
        className,
      )}
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
