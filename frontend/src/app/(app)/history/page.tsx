import { Suspense } from "react";
import { HistoryList } from "@/features/history/history-list";

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted" />}>
      <HistoryList />
    </Suspense>
  );
}
