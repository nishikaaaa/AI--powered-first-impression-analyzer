"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-fast disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:opacity-90",
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        subtle: "bg-muted text-foreground hover:bg-muted/80",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
