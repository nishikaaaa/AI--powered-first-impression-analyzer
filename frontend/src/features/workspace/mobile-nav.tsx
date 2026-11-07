"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Camera, FileText, History, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/linkedin", label: "LinkedIn", icon: Briefcase },
  { href: "/instagram", label: "Instagram", icon: Camera },
  { href: "/history", label: "History", icon: History },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card px-1 py-2 md:hidden"
      aria-label="Mobile"
    >
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-1 text-[10px]",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
