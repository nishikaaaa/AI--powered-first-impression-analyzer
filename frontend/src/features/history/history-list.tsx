"use client";

import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/shared/link-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/shared/empty-state";
import { PageHeader } from "@/shared/page-header";
import { AnalyzerIcon } from "@/shared/analyzer-icon";
import { getAnalyzer } from "@/lib/analyzers";
import { useHistory } from "@/hooks/use-history";

function statusVariant(status: string) {
  if (status === "success" || status === "partial") return "success" as const;
  if (status === "failed") return "rose" as const;
  return "warning" as const;
}

export function HistoryList() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const { items, ready } = useHistory(q);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="History"
        description="Analyses from this browser. Open a report when it’s ready, or resume one still running."
      />
      {!ready ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" aria-hidden />
      ) : items.length === 0 ? (
        <EmptyState
          title={q ? "Nothing matches that search" : "Your timeline is empty"}
          body={
            q
              ? "Try a different word, or clear search to see every analysis."
              : "Run Resume, LinkedIn, or Instagram and each report will appear here."
          }
          action={<LinkButton href="/dashboard">Start an analysis</LinkButton>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const analyzer = getAnalyzer(item.contentType);
            const href = item.reportId
              ? `/report/${item.reportId}`
              : `/analysis/${item.analysisId}`;
            return (
              <li key={item.analysisId}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AnalyzerIcon type={item.contentType} />
                      {analyzer.displayName}
                    </div>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {item.firstImpression || "Waiting for the first impression…"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <LinkButton href={href} variant="outline" size="sm" className="mt-4">
                    {item.reportId ? "Open Report" : "View progress"}
                  </LinkButton>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
