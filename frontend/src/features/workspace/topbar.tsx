"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/shared/theme-toggle";

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur md:px-8">
      <form
        className="relative max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/history${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
        }}
      >
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search analyses"
          aria-label="Search analyses"
          className="h-10 pl-4 pr-12"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium"
          aria-label="Signed in as developer"
        >
          DV
        </div>
      </div>
    </header>
  );
}
