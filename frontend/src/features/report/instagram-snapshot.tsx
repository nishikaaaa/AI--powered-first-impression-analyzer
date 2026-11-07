"use client";

import { useEffect, useRef } from "react";
import type {
  EvidenceReference,
  RewriteActionRequest,
  StructuredInstagramPost,
} from "@/lib/types";
import { overlayKey } from "@/lib/evidence";
import { ImproveButton } from "./improve-button";
import { cn } from "@/lib/utils";

export function InstagramSnapshot({
  post,
  activeEvidence,
  overlays,
  onRewrite,
}: {
  post: StructuredInstagramPost;
  activeEvidence: EvidenceReference[];
  overlays: Record<string, string>;
  onRewrite?: (req: RewriteActionRequest) => void;
}) {
  const highlightRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeEvidence]);

  const slides = post.mediaItems ?? [];
  const hashtagText = (post.hashtags ?? [])
    .map((h) => (h.tag.startsWith("#") ? h.tag : `#${h.tag}`))
    .join(" ");
  const captionKey = overlayKey("caption_main");
  const hashtagKey = overlayKey("hashtags");

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lift">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Original
      </h2>
      {post.caption?.original && (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed">{overlays[captionKey] ?? post.caption.original}</p>
            {onRewrite && (
              <ImproveButton
                label="Improve Caption"
                onClick={() =>
                  onRewrite({
                    targetId: "caption",
                    sectionId: "caption_main",
                    originalText: post.caption?.original,
                  })
                }
              />
            )}
          </div>
          {onRewrite && (
            <div className="mt-2">
              <ImproveButton
                label="Improve CTA"
                onClick={() =>
                  onRewrite({
                    targetId: "cta",
                    sectionId: "caption_main",
                    originalText: post.caption?.original,
                  })
                }
              />
            </div>
          )}
        </div>
      )}
      {hashtagText && (
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{overlays[hashtagKey] ?? hashtagText}</p>
          {onRewrite && (
            <ImproveButton
              label="Suggest Better Hashtags"
              onClick={() =>
                onRewrite({
                  targetId: "hashtags",
                  originalText: hashtagText,
                })
              }
            />
          )}
        </div>
      )}
      {!hashtagText && onRewrite && (
        <div className="mt-2">
          <ImproveButton
            label="Suggest Better Hashtags"
            onClick={() => onRewrite({ targetId: "hashtags", originalText: "" })}
          />
        </div>
      )}

      {slides.length > 0 && (
        <div className="mt-6 space-y-6">
          <h3 className="text-sm font-semibold">
            Visual Review{slides.length > 1 ? ` · ${slides.length} slides` : ""}
          </h3>
          {slides.map((media, index) => (
            <div key={media.mediaItemId} className="space-y-2">
              {slides.length > 1 && (
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Slide {index + 1}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {[media.orientation, media.aspectHint, media.visualStyle].filter(Boolean).join(" · ")}
              </p>
              <ul className="space-y-2">
                {media.regions.map((region) => {
                  const highlighted = activeEvidence.some((e) => e.sectionId === region.imageRegionId);
                  return (
                    <li
                      key={region.imageRegionId}
                      ref={highlighted ? highlightRef : undefined}
                      id={`section-${region.imageRegionId}`}
                      className={cn(
                        "rounded-xl px-2 py-1.5 text-sm leading-relaxed",
                        highlighted
                          ? "bg-highlight font-medium text-highlight-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="font-medium text-foreground">{region.label}</span>
                      <span className="mt-0.5 block">{region.description}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeEvidence.length === 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Select any insight on the right to highlight the visual region it came from.
        </p>
      )}
    </div>
  );
}
