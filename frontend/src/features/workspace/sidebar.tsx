"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Camera, FileText, History, LayoutGrid } from "lucide-react";
import { Logo } from "@/shared/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/linkedin", label: "LinkedIn", icon: Briefcase },
  { href: "/instagram", label: "Instagram", icon: Camera },
  { href: "/history", label: "History", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="px-5 py-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6" aria-label="Workspace">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-fast",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
