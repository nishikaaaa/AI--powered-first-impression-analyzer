import type { EvidenceReference } from "../../../domain/shared/evidence.js";
import {
  BRANDING_SECTION_ID,
  COMPOSITION_SECTION_ID,
  detectedTextEntryId,
  imageRegionId,
  mediaItemId,
  parseRegionIndex,
} from "../../../domain/instagram/instagram-ids.js";
import { normalizeHashtagTag as normalizeHashtagTagValue } from "../../../domain/instagram/normalized-instagram.js";
import type {
  InstagramImageRegion,
  InstagramMediaItem,
  InstagramRegionKind,
  InstagramRegionPosition,
  StructuredInstagramPost,
} from "../../../domain/instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../../../domain/linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "../../../domain/resume/structured-resume.js";

type RawEvidence = {
  sectionId: string;
  bulletId?: string;
  fieldPath?: string;
  excerpt?: string;
};

function normalizeEvidence(raw: RawEvidence): EvidenceReference {
  const ref: EvidenceReference = { sectionId: raw.sectionId.trim() };
  const bulletId = raw.bulletId?.trim();
  const fieldPath = raw.fieldPath?.trim();
  const excerpt = raw.excerpt?.trim();
  if (bulletId) ref.bulletId = bulletId;
  if (fieldPath) ref.fieldPath = fieldPath;
  if (excerpt) ref.excerpt = excerpt;
  return ref;
}

function stripEmptyIdentity(identity: Record<string, string | undefined>) {
  const out: StructuredResume["identity"] = {};
  for (const key of ["name", "headline", "email", "phone", "location"] as const) {
    const v = identity[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
}

export function normalizeStructuredResumeFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const identity = stripEmptyIdentity((o.identity as Record<string, string>) ?? {});
  const sections = (o.sections as unknown[])?.map((sec) => {
    const s = sec as Record<string, unknown>;
    const title = (s.title as string)?.trim();
    return {
      sectionId: s.sectionId,
      type: s.type,
      ...(title ? { title } : {}),
      bullets: s.bullets,
    };
  });
  return {
    schemaVersion: o.schemaVersion,
    identity,
    sections,
  };
}

export function normalizePersonaAnalysisFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const claims = (o.claims as unknown[])?.map((c) => {
    const claim = c as Record<string, unknown>;
    const evidence = (claim.evidence as RawEvidence[])?.map(normalizeEvidence);
    const conf = claim.confidence as Record<string, unknown>;
    const missing = conf.missingInformation as string[] | undefined;
    return {
      ...claim,
      evidence,
      confidence: {
        ...conf,
        missingInformation: missing?.filter((m) => m.trim().length > 0),
      },
    };
  });
  const fiEvidence = o.firstImpressionEvidence as RawEvidence[] | undefined;
  const normalizedFi =
    fiEvidence && fiEvidence.length > 0
      ? fiEvidence.map(normalizeEvidence).filter((e) => e.sectionId)
      : undefined;
  return {
    ...o,
    claims,
    ...(normalizedFi?.length ? { firstImpressionEvidence: normalizedFi } : {}),
  };
}

function stripEmptyLinkedInIdentity(identity: Record<string, string | undefined>) {
  const out: StructuredLinkedInProfile["identity"] = {};
  for (const key of [
    "name",
    "headline",
    "location",
    "industry",
    "connectionCount",
    "profileUrl",
  ] as const) {
    const v = identity[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
}

function normalizeLinkedInBlock(raw: Record<string, unknown>) {
  const title = (raw.title as string)?.trim();
  const body = (raw.body as string)?.trim();
  return {
    sectionId: raw.sectionId,
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    bullets: raw.bullets ?? [],
  };
}

export function normalizeStructuredLinkedInFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const identity = stripEmptyLinkedInIdentity((o.identity as Record<string, string>) ?? {});

  let about: unknown = o.about;
  if (about && typeof about === "object") {
    const b = normalizeLinkedInBlock(about as Record<string, unknown>);
    const block = b as { sectionId: string; title?: string; body?: string; bullets: unknown[] };
    const hasContent =
      block.title || block.body || (Array.isArray(block.bullets) && block.bullets.length > 0);
    about = hasContent ? b : undefined;
  }

  const mapBlocks = (arr: unknown[]) =>
    arr.map((item) => normalizeLinkedInBlock(item as Record<string, unknown>));

  const mapExperience = (arr: unknown[]) =>
    (arr as Record<string, unknown>[]).map((e) => ({
      sectionId: e.sectionId,
      title: e.title,
      company: (e.company as string)?.trim() || undefined,
      dateRange: (e.dateRange as string)?.trim() || undefined,
      location: (e.location as string)?.trim() || undefined,
      descriptionBullets: e.descriptionBullets ?? [],
    }));

  const mapEducation = (arr: unknown[]) =>
    (arr as Record<string, unknown>[]).map((e) => ({
      sectionId: e.sectionId,
      school: e.school,
      degree: (e.degree as string)?.trim() || undefined,
      dateRange: (e.dateRange as string)?.trim() || undefined,
      descriptionBullets: e.descriptionBullets ?? [],
    }));

  const mapRecommendations = (arr: unknown[]) =>
    (arr as Record<string, unknown>[]).map((r) => ({
      sectionId: r.sectionId,
      recommender: (r.recommender as string)?.trim() || undefined,
      relationship: (r.relationship as string)?.trim() || undefined,
      excerpt: r.excerpt,
    }));

  return {
    schemaVersion: o.schemaVersion,
    identity,
    ...(about ? { about } : {}),
    experience: mapExperience((o.experience as unknown[]) ?? []),
    education: mapEducation((o.education as unknown[]) ?? []),
    skills: o.skills ?? [],
    certifications: mapBlocks((o.certifications as unknown[]) ?? []),
    projects: mapBlocks((o.projects as unknown[]) ?? []),
    featured: mapBlocks((o.featured as unknown[]) ?? []),
    recommendations: mapRecommendations((o.recommendations as unknown[]) ?? []),
    licenses: mapBlocks((o.licenses as unknown[]) ?? []),
    volunteer: mapBlocks((o.volunteer as unknown[]) ?? []),
    publications: mapBlocks((o.publications as unknown[]) ?? []),
    honors: mapBlocks((o.honors as unknown[]) ?? []),
    languages: o.languages ?? [],
  };
}

function optionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeLogoVisible(raw: unknown): boolean | undefined {
  if (raw === true || raw === false) return raw;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "yes" || v === "true") return true;
  if (v === "no" || v === "false") return false;
  return undefined;
}

function normalizeOrientation(
  raw: unknown,
): InstagramMediaItem["orientation"] {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "portrait" || v === "landscape" || v === "square") return v;
  return undefined;
}

const REGION_KINDS = new Set<InstagramRegionKind>([
  "person",
  "product",
  "logo",
  "text_overlay",
  "scene",
  "object",
  "background",
  "other",
]);

function normalizeRegionKind(raw: unknown): InstagramRegionKind {
  if (typeof raw === "string" && REGION_KINDS.has(raw as InstagramRegionKind)) {
    return raw as InstagramRegionKind;
  }
  return "other";
}

function normalizeVertical(raw: unknown): InstagramRegionPosition["vertical"] {
  if (raw === "top" || raw === "center" || raw === "bottom" || raw === "unknown") return raw;
  return "unknown";
}

function normalizeHorizontal(raw: unknown): InstagramRegionPosition["horizontal"] {
  if (raw === "left" || raw === "center" || raw === "right" || raw === "unknown") return raw;
  return "unknown";
}

function clampConfidence(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function normalizeInstagramRegions(
  raw: unknown,
  mediaIndex: number,
): InstagramImageRegion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, regionIndex) => {
      const e = item as Record<string, unknown>;
      const label = optionalTrimmed(e.label);
      const description = optionalTrimmed(e.description);
      if (!label || !description) return undefined;
      const region: InstagramImageRegion = {
        imageRegionId: imageRegionId(mediaIndex, regionIndex),
        kind: normalizeRegionKind(e.kind),
        label,
        description,
        position: {
          vertical: normalizeVertical(e.vertical),
          horizontal: normalizeHorizontal(e.horizontal),
        },
      };
      return region;
    })
    .filter((r): r is InstagramImageRegion => Boolean(r));
}

export function normalizeStructuredInstagramFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const compositionRaw = (o.composition ?? {}) as Record<string, unknown>;
  const brandingRaw = (o.branding ?? {}) as Record<string, unknown>;

  const rawItems = Array.isArray(o.mediaItems)
    ? (o.mediaItems as unknown[])
    : o.media
      ? [o.media]
      : [];

  const mediaItems: InstagramMediaItem[] = rawItems.map((item, mediaIndex) => {
    const m = item as Record<string, unknown>;
    const mimeType = optionalTrimmed(m.mimeType);
    const aspectHint = optionalTrimmed(m.aspectHint);
    const visualStyle = optionalTrimmed(m.visualStyle);
    const orientation = normalizeOrientation(m.orientation);
    const regions = normalizeInstagramRegions(m.regions, mediaIndex);
    return {
      mediaItemId: mediaItemId(mediaIndex),
      mediaType: "image" as const,
      ...(mimeType ? { mimeType } : {}),
      ...(orientation ? { orientation } : {}),
      ...(aspectHint ? { aspectHint } : {}),
      ...(visualStyle ? { visualStyle } : {}),
      regions,
    };
  });

  const primaryRegions = mediaItems[0]?.regions ?? [];

  const detectedText = ((o.detectedText as unknown[]) ?? [])
    .map((item) => {
      const t = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const text = optionalTrimmed(t.text);
      if (!text) return undefined;
      const mediaIndex = parseRegionIndex(t.mediaIndex) ?? 0;
      const regions = mediaItems[mediaIndex]?.regions ?? [];
      const regionIndex = parseRegionIndex(t.regionIndex);
      if (regionIndex === undefined || !regions[regionIndex]) return undefined;
      return {
        text,
        imageRegionId: regions[regionIndex]!.imageRegionId,
        confidence: clampConfidence(t.confidence),
      };
    })
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t, textIndex) => ({
      ...t,
      detectedTextId: detectedTextEntryId(textIndex),
    }));

  const llmHashtags = ((o.hashtags as unknown[]) ?? [])
    .map((item) => {
      const h = (item && typeof item === "object" ? item : { tag: item }) as Record<string, unknown>;
      return typeof h.tag === "string" ? normalizeHashtagTagValue(h.tag) : undefined;
    })
    .filter((t): t is string => Boolean(t));

  const colorPalette = ((compositionRaw.colorPalette as unknown[]) ?? [])
    .map((c) => optionalTrimmed(c))
    .filter((c): c is string => Boolean(c));

  const layout = optionalTrimmed(compositionRaw.layout);
  const lighting = optionalTrimmed(compositionRaw.lighting);
  const focalIdx = parseRegionIndex(compositionRaw.focalPointRegionIndex);
  const focalPointRegionId =
    focalIdx !== undefined && primaryRegions[focalIdx]
      ? primaryRegions[focalIdx]!.imageRegionId
      : undefined;

  const brandName = optionalTrimmed(brandingRaw.brandName);
  const brandCues = optionalTrimmed(brandingRaw.brandCues);
  const logoVisible = normalizeLogoVisible(brandingRaw.logoVisible);
  const logoIdx = parseRegionIndex(brandingRaw.logoRegionIndex);
  const logoRegionId =
    logoIdx !== undefined && primaryRegions[logoIdx]
      ? primaryRegions[logoIdx]!.imageRegionId
      : undefined;

  const post: StructuredInstagramPost = {
    schemaVersion: "1.0",
    mediaItems,
    composition: {
      sectionId: COMPOSITION_SECTION_ID,
      ...(layout ? { layout } : {}),
      ...(lighting ? { lighting } : {}),
      colorPalette,
      ...(focalPointRegionId ? { focalPointRegionId } : {}),
    },
    branding: {
      sectionId: BRANDING_SECTION_ID,
      ...(brandName ? { brandName } : {}),
      ...(logoVisible !== undefined ? { logoVisible } : {}),
      ...(logoRegionId ? { logoRegionId } : {}),
      ...(brandCues ? { brandCues } : {}),
    },
    detectedText,
    caption: {
      original: "",
      normalized: "",
      sections: [],
    },
    hashtags: llmHashtags.map((tag, i) => ({
      hashtagId: `hashtag_${i}`,
      tag,
    })),
  };
  return post;
}

export function normalizeRewriteFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const warnings = Array.isArray(o.warnings)
    ? (o.warnings as unknown[]).map((w) => String(w).trim()).filter(Boolean)
    : [];
  const missing = Array.isArray(o.missingInformation)
    ? (o.missingInformation as unknown[]).map((w) => String(w).trim()).filter(Boolean)
    : [];
  return {
    rewrittenText: typeof o.rewrittenText === "string" ? o.rewrittenText.trim() : "",
    explanation: typeof o.explanation === "string" ? o.explanation.trim() : "",
    warnings,
    missingInformation: missing,
  };
}

export function normalizeAggregateFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const entries = o.personaHeadlineEntries as { personaId: string; headline: string }[] | undefined;
  const personaHeadlines: Record<string, string> = {};
  for (const e of entries ?? []) {
    if (e.personaId?.trim() && e.headline?.trim()) {
      personaHeadlines[e.personaId.trim()] = e.headline.trim();
    }
  }
  const synthesisClaims = (o.synthesisClaims as unknown[])?.map((s) => {
    const syn = s as Record<string, unknown>;
    return {
      ...syn,
      evidence: (syn.evidence as RawEvidence[])?.map(normalizeEvidence),
    };
  });
  return {
    executiveSummary: o.executiveSummary,
    overallFirstImpression: o.overallFirstImpression,
    consensusThemes: o.consensusThemes,
    conflictingPerspectives: o.conflictingPerspectives,
    personaHeadlines,
    synthesisClaims,
  };
}
