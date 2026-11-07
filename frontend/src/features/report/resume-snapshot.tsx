"use client";

import { useEffect, useRef } from "react";
import type { EvidenceReference, RewriteActionRequest, StructuredResume } from "@/lib/types";
import { isRefHighlighted, overlayKey } from "@/lib/evidence";
import { ImproveButton } from "./improve-button";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  other: "Other",
};

function targetForSection(type: string): { id: string; label: string } | undefined {
  if (type === "summary") return { id: "summary", label: "Rewrite Summary" };
  if (type === "skills") return { id: "skills_description", label: "Improve Skills" };
  if (type === "projects") return { id: "project_description", label: "Improve Project" };
  if (type === "experience") return { id: "experience_bullet", label: "Improve Bullet" };
  return undefined;
}

export function ResumeSnapshot({
  resume,
  activeEvidence,
  overlays,
  onRewrite,
}: {
  resume: StructuredResume;
  activeEvidence: EvidenceReference[];
  overlays: Record<string, string>;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  const highlightRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeEvidence]);

  const { identity } = resume;

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lift">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Original
      </h2>
      {identity.name && <p className="mt-3 text-lg font-semibold">{identity.name}</p>}
      {identity.headline && <p className="text-sm text-muted-foreground">{identity.headline}</p>}
      {(identity.email || identity.location) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[identity.email, identity.location].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {resume.sections.map((section) => {
          const sectionActive = activeEvidence.some(
            (e) => e.sectionId === section.sectionId && !e.bulletId,
          );
          const action = targetForSection(section.type);
          return (
            <section
              key={section.sectionId}
              id={`section-${section.sectionId}`}
              className={sectionActive ? "rounded-2xl ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {section.title ?? SECTION_LABELS[section.type] ?? section.type}
                </h3>
                {action && onRewrite && section.type !== "experience" && (
                  <ImproveButton
                    label={action.label}
                    onClick={() =>
                      onRewrite({
                        targetId: action.id,
                        sectionId: section.sectionId,
                        originalText: section.bullets.map((b) => b.text).join("\n"),
                      })
                    }
                  />
                )}
              </div>
              <ul className="mt-2 space-y-2">
                {section.bullets.map((bullet) => {
                  const highlighted = isRefHighlighted(
                    section.sectionId,
                    bullet.bulletId,
                    activeEvidence,
                  );
                  const key = overlayKey(section.sectionId, bullet.bulletId);
                  const text = overlays[key] ?? bullet.text;
                  const bulletTarget =
                    section.type === "experience"
                      ? { id: "experience_bullet", label: "Improve Bullet" }
                      : section.type === "projects"
                        ? { id: "project_description", label: "Improve Project" }
                        : undefined;
                  return (
                    <li
                      key={bullet.bulletId}
                      ref={highlighted ? highlightRef : undefined}
                      id={`bullet-${section.sectionId}-${bullet.bulletId}`}
                      className={cn(
                        "rounded-xl px-2 py-1.5 text-sm leading-relaxed",
                        highlighted
                          ? "bg-highlight font-medium text-highlight-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span>
                          {text}
                          {overlays[key] && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-success">
                              replaced
                            </span>
                          )}
                        </span>
                        {bulletTarget && onRewrite && (
                          <ImproveButton
                            label={bulletTarget.label}
                            onClick={() =>
                              onRewrite({
                                targetId: bulletTarget.id,
                                sectionId: section.sectionId,
                                bulletId: bullet.bulletId,
                                originalText: bullet.text,
                              })
                            }
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {activeEvidence.length === 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Select any insight on the right to highlight the resume lines it came from.
        </p>
      )}
    </div>
  );
}
