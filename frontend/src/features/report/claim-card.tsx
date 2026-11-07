"use client";

import { motion } from "framer-motion";
import type { EvidenceReference, InsightClaim, RewriteActionRequest } from "@/lib/types";
import { ConfidencePanel } from "./confidence";
import { ImproveButton } from "./improve-button";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<InsightClaim["kind"], string> = {
  strength: "border-l-emerald-500",
  weakness: "border-l-amber-500",
  concern: "border-l-rose-500",
  recommendation: "border-l-primary",
};

export function ClaimCard({
  claim,
  active,
  onSelectEvidence,
  onRewrite,
}: {
  claim: InsightClaim;
  active: boolean;
  onSelectEvidence: (refs: EvidenceReference[]) => void;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  const evidence = claim.evidence[0];
  return (
    <motion.div
      layout
      transition={{ duration: 0.18 }}
      className={cn(
        "w-full rounded-2xl border border-border border-l-4 bg-card p-4 text-left transition-shadow duration-fast hover:shadow-lift",
        KIND_STYLES[claim.kind],
        active && "ring-2 ring-ring",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectEvidence(claim.evidence)}
        className="w-full text-left"
        aria-expanded={active}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {claim.kind}
          </span>
          <span className="text-xs text-primary">Evidence</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{claim.statement}</p>
      </button>
      {onRewrite && evidence && (
        <div className="mt-3">
          <ImproveButton
            onClick={() =>
              onRewrite({
                sectionId: evidence.sectionId,
                bulletId: evidence.bulletId,
                originalText: evidence.excerpt,
              })
            }
          />
        </div>
      )}
      {active && (
        <>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Evidence ({claim.evidence.length})
          </p>
          <ul className="mt-1 space-y-1">
            {claim.evidence.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {e.sectionId}
                {e.bulletId ? ` · ${e.bulletId}` : ""}
                {e.excerpt ? ` — “${e.excerpt.slice(0, 80)}…”` : ""}
              </li>
            ))}
          </ul>
          <ConfidencePanel c={claim.confidence} />
        </>
      )}
    </motion.div>
  );
}
