import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
