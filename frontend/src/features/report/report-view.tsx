"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  AggregateReport,
  ContentVersionResponse,
  EvidenceReference,
  InsightClaim,
  PersonaAnalysis,
  ReportSection,
  RewriteActionRequest,
} from "@/lib/types";
import { getAnalyzer } from "@/lib/analyzers";
import { evidenceKey } from "@/lib/evidence";
import { upsertHistory } from "@/lib/history";
import { ClaimCard } from "./claim-card";
import { ImproveButton } from "./improve-button";
import { InstagramSnapshot } from "./instagram-snapshot";
import { LinkedInSnapshot } from "./linkedin-snapshot";
import { ResumeSnapshot } from "./resume-snapshot";
import { RewriteDrawer } from "./rewrite-drawer";
import { cn } from "@/lib/utils";

export function ReportView({
  reportId,
  report,
  personaResults,
  contentVersion,
}: {
  reportId: string;
  report: AggregateReport;
  personaResults: PersonaAnalysis[];
  contentVersion: ContentVersionResponse;
}) {
  const [activeEvidence, setActiveEvidence] = useState<EvidenceReference[]>([]);
  const [tab, setTab] = useState<string>("overview");
  const [rewriteRequest, setRewriteRequest] = useState<RewriteActionRequest | null>(null);
  const [overlays, setOverlays] = useState<Record<string, string>>({});

  const activeKeySet = useMemo(
    () => new Set(activeEvidence.map(evidenceKey)),
    [activeEvidence],
  );

  const unavailable = report.availability.filter((a) => a.status === "unavailable");
  const analyzer = getAnalyzer(contentVersion.contentType);
  const extraSections = report.reportDefinition?.extraSections ?? analyzer.extraSections;
  const grouped = useMemo(() => groupClaims(personaResults), [personaResults]);

  useEffect(() => {
    upsertHistory({
      analysisId: report.analysisRunId,
      reportId,
      contentType: contentVersion.contentType,
      status: "success",
      firstImpression: report.overallFirstImpression,
    });
  }, [contentVersion.contentType, report.analysisRunId, report.overallFirstImpression, reportId]);

  const tabs = [
    { id: "overview", label: "Overview" },
    ...personaResults.map((p) => ({ id: p.personaId, label: p.personaDisplayName })),
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-lift lg:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
          Overall First Impression
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-balance md:text-3xl">
          {report.overallFirstImpression}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {report.executiveSummary}
        </p>
        {unavailable.length > 0 && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-200">
            Unavailable perspectives: {unavailable.map((u) => u.displayName).join(", ")}. Report
            based on {personaResults.length} completed lenses.
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-start">
        <SnapshotPanel
          contentVersion={contentVersion}
          activeEvidence={activeEvidence}
          overlays={overlays}
          onRewrite={setRewriteRequest}
        />

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setActiveEvidence([]);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-fast",
                  tab === t.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <OverviewTab
                  report={report}
                  contentVersion={contentVersion}
                  extraSections={extraSections}
                  grouped={grouped}
                  activeKeySet={activeKeySet}
                  onSelectEvidence={setActiveEvidence}
                  onRewrite={setRewriteRequest}
                />
              </motion.div>
            ) : (
              personaResults.map(
                (p) =>
                  tab === p.personaId && (
                    <motion.div
                      key={p.personaId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      <PersonaTab
                        persona={p}
                        activeKeySet={activeKeySet}
                        onSelectEvidence={setActiveEvidence}
                        onRewrite={setRewriteRequest}
                      />
                    </motion.div>
                  ),
              )
            )}
          </AnimatePresence>
        </div>
      </div>
      {rewriteRequest && (
        <RewriteDrawer
          analysisId={report.analysisRunId}
          contentType={contentVersion.contentType}
          request={rewriteRequest}
          onClose={() => setRewriteRequest(null)}
          onReplace={(key, rewritten) =>
            setOverlays((prev) => ({ ...prev, [key]: rewritten }))
          }
        />
      )}
    </div>
  );
}

function SnapshotPanel({
  contentVersion,
  activeEvidence,
  overlays,
  onRewrite,
}: {
  contentVersion: ContentVersionResponse;
  activeEvidence: EvidenceReference[];
  overlays: Record<string, string>;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  if (contentVersion.contentType === "linkedin_profile") {
    return (
      <LinkedInSnapshot
        profile={contentVersion.structuredLinkedInProfile}
        activeEvidence={activeEvidence}
        overlays={overlays}
        onRewrite={onRewrite}
      />
    );
  }
  if (contentVersion.contentType === "instagram_post") {
    return (
      <InstagramSnapshot
        post={contentVersion.structuredInstagramPost}
        activeEvidence={activeEvidence}
        overlays={overlays}
        onRewrite={onRewrite}
      />
    );
  }
  return (
    <ResumeSnapshot
      resume={contentVersion.structuredResume}
      activeEvidence={activeEvidence}
      overlays={overlays}
      onRewrite={onRewrite}
    />
  );
}

function groupClaims(personas: PersonaAnalysis[]) {
  const all = personas.flatMap((p) => p.claims);
  return {
    strengths: all.filter((c) => c.kind === "strength"),
    weaknesses: all.filter((c) => c.kind === "weakness" || c.kind === "concern"),
    recommendations: all.filter((c) => c.kind === "recommendation"),
  };
}

function ClaimList({
  title,
  empty,
  claims,
  activeKeySet,
  onSelectEvidence,
  onRewrite,
}: {
  title: string;
  empty: string;
  claims: InsightClaim[];
  activeKeySet: Set<string>;
  onSelectEvidence: (refs: EvidenceReference[]) => void;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {claims.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.claimId}
              claim={claim}
              active={claim.evidence.some((e) => activeKeySet.has(evidenceKey(e)))}
              onSelectEvidence={onSelectEvidence}
              onRewrite={onRewrite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function OverviewTab({
  report,
  contentVersion,
  extraSections,
  grouped,
  activeKeySet,
  onSelectEvidence,
  onRewrite,
}: {
  report: AggregateReport;
  contentVersion: ContentVersionResponse;
  extraSections: ReportSection[];
  grouped: ReturnType<typeof groupClaims>;
  activeKeySet: Set<string>;
  onSelectEvidence: (refs: EvidenceReference[]) => void;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  return (
    <div className="space-y-8">
      {report.consensusThemes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Consensus</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.consensusThemes.map((t) => (
              <li key={t} className="rounded-full bg-muted px-3 py-1 text-sm">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.conflictingPerspectives.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Tension</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {report.conflictingPerspectives.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <ClaimList
        title="Strengths"
        empty="No standout strengths were called out. Open a persona tab for the finer read."
        claims={grouped.strengths}
        activeKeySet={activeKeySet}
        onSelectEvidence={onSelectEvidence}
        onRewrite={onRewrite}
      />
      <ClaimList
        title="Weaknesses"
        empty="No material weaknesses were flagged. That usually means the content is clear — still check persona tension."
        claims={grouped.weaknesses}
        activeKeySet={activeKeySet}
        onSelectEvidence={onSelectEvidence}
        onRewrite={onRewrite}
      />
      <ClaimList
        title="Recommendations"
        empty="No explicit recommendations yet. Use Improve with AI on a section to the left."
        claims={grouped.recommendations}
        activeKeySet={activeKeySet}
        onSelectEvidence={onSelectEvidence}
        onRewrite={onRewrite}
      />

      {extraSections.map((section) => (
        <ExtraReportSection
          key={section.id}
          section={section}
          contentVersion={contentVersion}
          onRewrite={onRewrite}
        />
      ))}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Synthesis</h3>
        {report.synthesisClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Synthesis is still thin. Persona tabs have the detailed claims.
          </p>
        ) : (
          report.synthesisClaims.map((s) => {
            const active = s.evidence.some((e) => activeKeySet.has(evidenceKey(e)));
            return (
              <button
                key={s.claimId}
                type="button"
                onClick={() => onSelectEvidence(s.evidence)}
                className={cn(
                  "w-full rounded-2xl border border-border bg-card p-4 text-left text-sm transition-shadow duration-fast hover:shadow-lift",
                  active && "ring-2 ring-ring",
                )}
              >
                <p>{s.statement}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  From: {s.sourcePersonaIds.join(", ")}
                </p>
              </button>
            );
          })
        )}
      </div>

      <section className="rounded-2xl border border-dashed border-border p-5">
        <h3 className="text-sm font-semibold">AI Rewrite</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Every section can be rewritten without inventing metrics. Open Improve with AI on a
          claim or on the original content.
        </p>
      </section>
    </div>
  );
}

function ExtraReportSection({
  section,
  contentVersion,
  onRewrite,
}: {
  section: ReportSection;
  contentVersion: ContentVersionResponse;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  if (section.id === "skills" && contentVersion.contentType === "resume") {
    const skills = contentVersion.structuredResume.sections.filter((s) => s.type === "skills");
    if (skills.length === 0) return null;
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{section.label}</h3>
          {onRewrite && skills[0] && (
            <ImproveButton
              label="Improve Skills"
              onClick={() =>
                onRewrite({
                  targetId: "skills_description",
                  sectionId: skills[0]!.sectionId,
                  originalText: skills.flatMap((s) => s.bullets.map((b) => b.text)).join("\n"),
                })
              }
            />
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.flatMap((s) =>
            s.bullets.map((b) => (
              <li
                key={`${s.sectionId}-${b.bulletId}`}
                className="rounded-full bg-muted px-3 py-1 text-sm"
              >
                {b.text}
              </li>
            )),
          )}
        </ul>
      </div>
    );
  }

  if (section.id === "experience" && contentVersion.contentType === "linkedin_profile") {
    const experience = contentVersion.structuredLinkedInProfile.experience;
    if (experience.length === 0) return null;
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{section.label}</h3>
          {onRewrite && experience[0] && (
            <ImproveButton
              label="Improve Experience"
              onClick={() =>
                onRewrite({
                  targetId: "experience",
                  sectionId: experience[0]!.sectionId,
                })
              }
            />
          )}
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {experience.map((item) => (
            <li key={item.sectionId}>{[item.title, item.company].filter(Boolean).join(" · ")}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.id === "visualReview" && contentVersion.contentType === "instagram_post") {
    const regions = contentVersion.structuredInstagramPost.mediaItems.flatMap((m) => m.regions);
    if (regions.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold">{section.label}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {regions.map((region) => (
            <li key={region.imageRegionId}>
              {region.label}: {region.description}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

function PersonaTab({
  persona,
  activeKeySet,
  onSelectEvidence,
  onRewrite,
}: {
  persona: PersonaAnalysis;
  activeKeySet: Set<string>;
  onSelectEvidence: (refs: EvidenceReference[]) => void;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/70 p-4">
        <p className="text-sm font-medium">{persona.firstImpression}</p>
        <p className="mt-2 text-xs text-muted-foreground">{persona.snapshotSeconds}</p>
        <p className="mt-2 text-xs text-muted-foreground">{persona.lensSummary}</p>
      </div>
      {persona.claims.map((claim) => (
        <ClaimCard
          key={claim.claimId}
          claim={claim}
          active={claim.evidence.some((e) => activeKeySet.has(evidenceKey(e)))}
          onSelectEvidence={onSelectEvidence}
          onRewrite={onRewrite}
        />
      ))}
    </div>
  );
}
