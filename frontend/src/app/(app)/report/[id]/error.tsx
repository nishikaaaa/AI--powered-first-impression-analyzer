"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/empty-state";
import { LinkButton } from "@/shared/link-button";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      title="This report couldn’t be opened"
      body={error.message || "The analysis may still be running, or the API is offline."}
      action={
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <LinkButton href="/history" variant="outline">
            Back to history
          </LinkButton>
        </div>
      }
    />
  );
}
