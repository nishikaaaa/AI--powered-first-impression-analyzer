"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { getRewriteCatalog, requestRewrite } from "@/lib/api";
import { REWRITE_MODES, getAnalyzer } from "@/lib/analyzers";
import { overlayKey } from "@/lib/evidence";
import type { RewriteActionRequest, RewriteModeOption, RewriteResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RewriteDrawer({
  analysisId,
  contentType,
  request,
  onClose,
  onReplace,
}: {
  analysisId: string;
  contentType: string;
  request: RewriteActionRequest;
  onClose: () => void;
  onReplace: (key: string, rewritten: string) => void;
}) {
  const analyzer = getAnalyzer(contentType);
  const target = request.targetId
    ? analyzer.rewriteTargets.find((t) => t.id === request.targetId)
    : undefined;
  const [modes, setModes] = useState<RewriteModeOption[]>(REWRITE_MODES);
  const [mode, setMode] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    void getRewriteCatalog()
      .then((catalog) => {
        const analyzerModes = catalog.analyzers[contentType]?.modes;
        if (catalog.modes?.length) {
          const preferred = analyzerModes?.length
            ? catalog.modes.filter((m) => analyzerModes.includes(m.id))
            : catalog.modes;
          setModes(preferred.length ? preferred : catalog.modes);
        }
      })
      .catch(() => undefined);
  }, [contentType]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run() {
    setLoading(true);
    setError(null);
    setCopied(false);
    setReplaced(false);
    try {
      const out = await requestRewrite(analysisId, { ...request, mode });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyRewritten() {
    if (!result?.rewrittenText) return;
    await navigator.clipboard.writeText(result.rewrittenText);
    setCopied(true);
  }

  function replace() {
    if (!result) return;
    const key = overlayKey(result.sectionId ?? request.sectionId ?? "unknown", result.bulletId ?? request.bulletId);
    onReplace(key, result.rewrittenText);
    setReplaced(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-foreground/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewrite-title"
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 24, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
              Improve with AI
            </p>
            <h2 id="rewrite-title" className="mt-1 font-display text-lg font-semibold">
              {target?.actionLabel ?? "Rewrite"}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close rewrite panel" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">Rewrite style</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-fast",
                    mode === m.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Button type="button" onClick={() => void run()} disabled={loading} className="mt-5">
            {loading ? "Rewriting…" : result ? "Rewrite again" : "Generate rewrite"}
          </Button>

          {error && (
            <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-6 space-y-5">
              {compare ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Compare</p>
                  <p className="whitespace-pre-wrap rounded-2xl bg-muted p-4 text-sm leading-relaxed">
                    {result.originalText}
                  </p>
                  <ArrowRight className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                  <p className="whitespace-pre-wrap rounded-2xl border border-primary/30 p-4 text-sm leading-relaxed">
                    {result.rewrittenText}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Panel label="Original">{result.originalText}</Panel>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <Panel label="Rewritten" accent>
                    {result.rewrittenText}
                  </Panel>
                  <Panel label="Explanation">{result.explanation}</Panel>
                </div>
              )}
              {result.warnings.length > 0 && (
                <ul className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-200">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {result && (
          <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyRewritten()}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={replace}>
              {replaced ? "Replaced" : "Replace"}
            </Button>
            <Button type="button" variant="subtle" size="sm" onClick={() => setCompare((v) => !v)}>
              {compare ? "Hide compare" : "Compare"}
            </Button>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}

function Panel({
  label,
  children,
  accent,
}: {
  label: string;
  children: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", accent ? "border-primary/30" : "border-border bg-muted/40")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{children}</p>
    </div>
  );
}
