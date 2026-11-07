"use client";

import { useEffect, useRef, type RefObject } from "react";
import type {
  EvidenceReference,
  LinkedInBlock,
  LinkedInExperienceItem,
  RewriteActionRequest,
  StructuredLinkedInProfile,
} from "@/lib/types";
import { isRefHighlighted, overlayKey } from "@/lib/evidence";
import { ImproveButton } from "./improve-button";
import { cn } from "@/lib/utils";

function BulletList({
  sectionId,
  bullets,
  activeEvidence,
  highlightRef,
  overlays,
}: {
  sectionId: string;
  bullets: { bulletId: string; text: string }[];
  activeEvidence: EvidenceReference[];
  highlightRef: RefObject<HTMLLIElement | null>;
  overlays: Record<string, string>;
}) {
  if (!bullets.length) return null;
  return (
    <ul className="mt-2 space-y-2">
      {bullets.map((bullet) => {
        const highlighted = isRefHighlighted(sectionId, bullet.bulletId, activeEvidence);
        const key = overlayKey(sectionId, bullet.bulletId);
        return (
          <li
            key={bullet.bulletId}
            ref={highlighted ? highlightRef : undefined}
            id={`bullet-${sectionId}-${bullet.bulletId}`}
            className={cn(
              "rounded-xl px-2 py-1.5 text-sm leading-relaxed",
              highlighted ? "bg-highlight font-medium text-highlight-foreground" : "text-muted-foreground",
            )}
          >
            {overlays[key] ?? bullet.text}
          </li>
        );
      })}
    </ul>
  );
}

function BlockSection({
  heading,
  block,
  activeEvidence,
  highlightRef,
  actionLabel,
  onRewrite,
  targetId,
  overlays,
}: {
  heading: string;
  block: LinkedInBlock;
  activeEvidence: EvidenceReference[];
  highlightRef: RefObject<HTMLLIElement | null>;
  actionLabel?: string;
  targetId?: string;
  onRewrite?: (req: RewriteActionRequest) => void;
  overlays: Record<string, string>;
}) {
  const sectionActive = activeEvidence.some(
    (e) => e.sectionId === block.sectionId && !e.bulletId,
  );
  const bodyKey = overlayKey(block.sectionId);
  return (
    <section
      id={`section-${block.sectionId}`}
      className={sectionActive ? "rounded-2xl ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{block.title || heading}</h3>
        {actionLabel && targetId && onRewrite && (
          <ImproveButton
            label={actionLabel}
            onClick={() =>
              onRewrite({
                targetId,
                sectionId: block.sectionId,
                originalText: [block.body, ...block.bullets.map((b) => b.text)]
                  .filter(Boolean)
                  .join("\n"),
              })
            }
          />
        )}
      </div>
      {block.body && (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            isRefHighlighted(block.sectionId, undefined, activeEvidence)
              ? "rounded-xl bg-highlight px-2 py-1 font-medium text-highlight-foreground"
              : "text-muted-foreground",
          )}
        >
          {overlays[bodyKey] ?? block.body}
        </p>
      )}
      <BulletList
        sectionId={block.sectionId}
        bullets={block.bullets}
        activeEvidence={activeEvidence}
        highlightRef={highlightRef}
        overlays={overlays}
      />
    </section>
  );
}

function ExperienceSection({
  item,
  activeEvidence,
  highlightRef,
  onRewrite,
  overlays,
}: {
  item: LinkedInExperienceItem;
  activeEvidence: EvidenceReference[];
  highlightRef: RefObject<HTMLLIElement | null>;
  onRewrite?: (req: RewriteActionRequest) => void;
  overlays: Record<string, string>;
}) {
  const sectionActive = activeEvidence.some(
    (e) => e.sectionId === item.sectionId && !e.bulletId,
  );
  const titleLine = [item.title, item.company].filter(Boolean).join(" · ");
  return (
    <section
      id={`section-${item.sectionId}`}
      className={sectionActive ? "rounded-2xl ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{titleLine}</h3>
        {onRewrite && (
          <ImproveButton
            label="Improve Experience"
            onClick={() =>
              onRewrite({
                targetId: "experience",
                sectionId: item.sectionId,
                originalText: item.descriptionBullets.map((b) => b.text).join("\n"),
              })
            }
          />
        )}
      </div>
      {(item.dateRange || item.location) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[item.dateRange, item.location].filter(Boolean).join(" · ")}
        </p>
      )}
      <BulletList
        sectionId={item.sectionId}
        bullets={item.descriptionBullets}
        activeEvidence={activeEvidence}
        highlightRef={highlightRef}
        overlays={overlays}
      />
    </section>
  );
}

export function LinkedInSnapshot({
  profile,
  activeEvidence,
  overlays,
  onRewrite,
}: {
  profile: StructuredLinkedInProfile;
  activeEvidence: EvidenceReference[];
  overlays: Record<string, string>;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  const highlightRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeEvidence]);

  const { identity } = profile;
  const headlineKey = overlayKey("headline");

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lift">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Original
      </h2>
      {identity.name && <p className="mt-3 text-lg font-semibold">{identity.name}</p>}
      {identity.headline && (
        <div className="mt-1 flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              isRefHighlighted("headline", undefined, activeEvidence)
                ? "rounded-xl bg-highlight px-2 py-1 font-medium text-highlight-foreground"
                : "text-muted-foreground",
            )}
          >
            {overlays[headlineKey] ?? identity.headline}
          </p>
          {onRewrite && (
            <ImproveButton
              label="Improve Headline"
              onClick={() =>
                onRewrite({
                  targetId: "headline",
                  sectionId: "headline",
                  originalText: identity.headline,
                })
              }
            />
          )}
        </div>
      )}
      {(identity.location || identity.industry) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[identity.location, identity.industry].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {profile.about && (
          <BlockSection
            heading="About"
            block={profile.about}
            activeEvidence={activeEvidence}
            highlightRef={highlightRef}
            actionLabel="Rewrite About"
            targetId="about"
            onRewrite={onRewrite}
            overlays={overlays}
          />
        )}

        {profile.experience.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Experience</h3>
            {profile.experience.map((exp) => (
              <ExperienceSection
                key={exp.sectionId}
                item={exp}
                activeEvidence={activeEvidence}
                highlightRef={highlightRef}
                onRewrite={onRewrite}
                overlays={overlays}
              />
            ))}
          </div>
        )}

        {profile.education.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Education</h3>
            {profile.education.map((edu) => (
              <section key={edu.sectionId} id={`section-${edu.sectionId}`}>
                <p className="text-sm font-medium">
                  {[edu.school, edu.degree].filter(Boolean).join(" — ")}
                </p>
                {edu.dateRange && <p className="text-xs text-muted-foreground">{edu.dateRange}</p>}
                <BulletList
                  sectionId={edu.sectionId}
                  bullets={edu.descriptionBullets}
                  activeEvidence={activeEvidence}
                  highlightRef={highlightRef}
                  overlays={overlays}
                />
              </section>
            ))}
          </div>
        )}

        {profile.skills.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold">Skills</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((skill) => {
                const highlighted = activeEvidence.some((e) => e.sectionId === skill.skillId);
                return (
                  <li
                    key={skill.skillId}
                    id={`section-${skill.skillId}`}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs",
                      highlighted
                        ? "bg-highlight font-medium text-highlight-foreground ring-2 ring-ring"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {skill.name}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {profile.certifications.map((b) => (
          <BlockSection
            key={b.sectionId}
            heading="Certification"
            block={b}
            activeEvidence={activeEvidence}
            highlightRef={highlightRef}
            overlays={overlays}
          />
        ))}

        {profile.projects.map((b) => (
          <BlockSection
            key={b.sectionId}
            heading="Project"
            block={b}
            activeEvidence={activeEvidence}
            highlightRef={highlightRef}
            overlays={overlays}
          />
        ))}

        {profile.featured.map((b) => (
          <BlockSection
            key={b.sectionId}
            heading="Featured"
            block={b}
            activeEvidence={activeEvidence}
            highlightRef={highlightRef}
            actionLabel="Improve Featured"
            targetId="featured_description"
            onRewrite={onRewrite}
            overlays={overlays}
          />
        ))}

        {profile.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recommendations</h3>
            {profile.recommendations.map((rec) => {
              const highlighted = activeEvidence.some((e) => e.sectionId === rec.sectionId);
              return (
                <blockquote
                  key={rec.sectionId}
                  id={`section-${rec.sectionId}`}
                  className={cn(
                    "rounded-2xl border border-border px-3 py-2 text-sm",
                    highlighted ? "bg-highlight ring-2 ring-ring" : "text-muted-foreground",
                  )}
                >
                  {rec.recommender && <p className="text-xs font-medium text-foreground">{rec.recommender}</p>}
                  <p className="mt-1">{rec.excerpt}</p>
                </blockquote>
              );
            })}
          </div>
        )}
      </div>

      {activeEvidence.length === 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Select any insight on the right to highlight the profile lines it came from.
        </p>
      )}
    </div>
  );
}
