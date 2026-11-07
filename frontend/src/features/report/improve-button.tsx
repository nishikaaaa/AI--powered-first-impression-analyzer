"use client";

import { Sparkles } from "lucide-react";

export function ImproveButton({
  label = "Improve with AI",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-opacity duration-fast hover:opacity-80"
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {label}
    </button>
  );
}
