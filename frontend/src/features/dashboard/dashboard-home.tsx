"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/shared/link-button";
import { PageHeader } from "@/shared/page-header";
import { AnalyzerIcon } from "@/shared/analyzer-icon";
import { EmptyState } from "@/shared/empty-state";
import { getAnalyzer } from "@/lib/analyzers";
import { useHistory } from "@/hooks/use-history";
import { Badge } from "@/components/ui/badge";

const ANALYZER_LINKS = [
  {
    type: "resume" as const,
    href: "/resume",
    title: "Resume",
    body: "Upload a PDF and see four hiring lenses on your first 30 seconds.",
  },
  {
    type: "linkedin_profile" as const,
    href: "/linkedin",
    title: "LinkedIn",
    body: "Paste profile text. Get evidence-backed notes on headline and About.",
  },
  {
    type: "instagram_post" as const,
    href: "/instagram",
    title: "Instagram",
    body: "One photo or a carousel, plus caption and hashtags.",
  },
];

export function DashboardHome() {
  const { items, ready } = useHistory();
  const recent = items.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="What should we read first?"
        description="Choose an analyzer. You’ll get a multi-persona first impression, then you can rewrite the weak spots."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {ANALYZER_LINKS.map((item, i) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <Link href={item.href} className="block h-full">
              <Card className="h-full p-6 transition-transform duration-fast hover:-translate-y-0.5">
                <AnalyzerIcon type={item.type} className="h-5 w-5 text-primary" />
                <h2 className="mt-4 font-display text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Start <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent</h2>
          <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
            View history
          </Link>
        </div>
        {!ready ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted" aria-hidden />
        ) : recent.length === 0 ? (
          <EmptyState
            title="Your workspace is waiting"
            body="Your reports will live here after you run Resume, LinkedIn, or Instagram."
            action={<LinkButton href="/resume">Analyze a resume</LinkButton>}
          />
        ) : (
          <ul className="grid gap-3">
            {recent.map((item) => {
              const analyzer = getAnalyzer(item.contentType);
              return (
                <li key={item.analysisId}>
                  <Link
                    href={item.reportId ? `/report/${item.reportId}` : `/analysis/${item.analysisId}`}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <AnalyzerIcon type={item.contentType} />
                      <div>
                        <p className="text-sm font-medium">{analyzer.displayName}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {item.firstImpression || "In progress"}
                        </p>
                      </div>
                    </div>
                    <Badge>{item.status}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
