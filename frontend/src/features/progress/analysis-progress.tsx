"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { analysisEventsUrl, getAnalysis, getReport } from "@/lib/api";
import { getAnalyzer, PERSONA_LABELS } from "@/lib/analyzers";
import { upsertHistory } from "@/lib/history";
import { LinkButton } from "@/shared/link-button";
import { PageHeader } from "@/shared/page-header";
import type { AnalysisEvent, AnalysisRun } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_PERSONAS = ["recruiter", "engineering_manager", "founder", "hr"];

export function AnalysisProgress({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    function goToReport(reportId: string, contentType?: AnalysisRun["contentType"]) {
      upsertHistory({
        analysisId,
        reportId,
        status: "success",
        ...(contentType ? { contentType } : {}),
      });
      void getReport(reportId)
        .then((r) =>
          upsertHistory({
            analysisId,
            firstImpression: r.overallFirstImpression,
            status: "success",
            reportId,
          }),
        )
        .catch(() => undefined);
      router.replace(`/report/${reportId}`);
    }

    void getAnalysis(analysisId).then((r) => {
      if (cancelled) return;
      setRun(r);
      upsertHistory({
        analysisId,
        contentId: r.contentId,
        contentType: r.contentType ?? "resume",
        status: r.status,
        reportId: r.reportId,
      });
      if (r.reportId && (r.status === "success" || r.status === "partial")) {
        goToReport(r.reportId, r.contentType);
      }
      if (r.status === "failed") {
        setFailed(getAnalyzer(r.contentType).failedMessage);
        upsertHistory({ analysisId, status: "failed" });
      }
    });

    const es = new EventSource(analysisEventsUrl(analysisId));

    es.onerror = () => {
      if (!cancelled && !failed) {
        /* keep polling */
      }
    };

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as AnalysisEvent;
        if (data.type === "persona.completed") {
          setRun((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              personaSteps: prev.personaSteps.map((s) =>
                s.personaId === data.personaId ? { ...s, status: data.status } : s,
              ),
            };
          });
        }
        if (data.type === "report.ready") {
          goToReport(data.reportId);
        }
        if (data.type === "analysis.failed") {
          setFailed(data.reason);
          upsertHistory({ analysisId, status: "failed" });
        }
      } catch {
        /* ignore parse errors */
      }
    };

    const poll = setInterval(() => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setTimedOut(true);
        setFailed(
          "This is taking longer than expected. Workers may be offline — check the API and queue workers, then try again.",
        );
        return;
      }
      void getAnalysis(analysisId).then((r) => {
        if (cancelled) return;
        setRun(r);
        if (r.reportId && (r.status === "success" || r.status === "partial")) {
          goToReport(r.reportId, r.contentType);
        }
        if (r.status === "failed") {
          setFailed(getAnalyzer(r.contentType).failedMessage);
          upsertHistory({ analysisId, status: "failed" });
        }
      });
    }, 4000);

    return () => {
      cancelled = true;
      es.close();
      clearInterval(poll);
    };
  }, [analysisId, router]);

  const analyzer = getAnalyzer(run?.contentType);
  const personaIds = run?.personaSteps.length
    ? run.personaSteps.map((s) => s.personaId)
    : DEFAULT_PERSONAS;

  const steps = useMemo(() => {
    const personaState = (id: string) =>
      run?.personaSteps.find((s) => s.personaId === id)?.status ?? "pending";
    const anyPersonaStarted = run?.personaSteps.some((s) => s.status !== "pending") ?? false;
    const structureDone =
      Boolean(run?.contentVersionId) || anyPersonaStarted || (run?.status !== undefined && run.status !== "queued");
    const structureRunning = Boolean(run) && !structureDone && !failed;
    const allPersonasDone =
      run?.personaSteps.every((s) => s.status === "success" || s.status === "failed") ?? false;
    const reportRunning = run?.status === "aggregating" || (allPersonasDone && !run?.reportId);
    const reportDone = Boolean(run?.reportId);

    return [
      {
        id: "structure",
        label: "Structuring content",
        state: failed && !structureDone ? "failed" : structureDone ? "done" : structureRunning ? "running" : "pending",
      },
      ...personaIds.map((id) => {
        const status = personaState(id);
        const label = `${PERSONA_LABELS[id] ?? id} reviewing...`;
        const state =
          status === "success"
            ? "done"
            : status === "failed"
              ? "failed"
              : status === "running"
                ? "running"
                : structureDone
                  ? "pending"
                  : "pending";
        return { id, label, state };
      }),
      {
        id: "report",
        label: "Building report...",
        state: reportDone ? "done" : reportRunning ? "running" : "pending",
      },
    ];
  }, [failed, personaIds, run]);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader
        eyebrow={analyzer.displayName}
        title="Reading first impressions"
        description="Each persona reviews independently. You’ll land on the report as soon as the synthesis is ready."
      />
      <ol className="space-y-3" aria-live="polite">
        {steps.map((step) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <StepIcon state={step.state} />
            <span
              className={cn(
                "text-sm",
                step.state === "running" && "font-medium",
                step.state === "pending" && "text-muted-foreground",
                step.state === "failed" && "text-rose-700 dark:text-rose-300",
              )}
            >
              {step.label}
            </span>
          </motion.li>
        ))}
      </ol>
      {failed && (
        <div className="space-y-3">
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">
            {failed}
          </p>
          {!timedOut && <LinkButton href={analyzer.retryHref}>Try again</LinkButton>}
        </div>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: string }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-success dark:bg-emerald-950">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950">
        <Circle className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Circle className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
