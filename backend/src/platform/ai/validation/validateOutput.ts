import { z } from "zod";
import type { EvidenceReference } from "../../../domain/shared/evidence.js";
import {
  aggregateReportSchema,
  insightClaimSchema,
  personaAnalysisSchema,
  structuredResumeSchema,
} from "./schemas/structured-resume.schema.js";
import { collectInstagramEvidenceIndex } from "../../../domain/instagram/instagram-ids.js";
import { rewriteLlmSchema } from "./schemas/rewrite.schema.js";
import { structuredInstagramPostSchema } from "./schemas/structured-instagram.schema.js";
import { structuredLinkedInProfileSchema } from "./schemas/structured-linkedin.schema.js";

export type ValidationOutcome = {
  valid: boolean;
  errorCount: number;
  repairAttempted: boolean;
  errors: string[];
  data?: unknown;
};

type LinkedInProfile = z.infer<typeof structuredLinkedInProfileSchema>;
type InstagramPost = z.infer<typeof structuredInstagramPostSchema>;

function linkedInBlocks(profile: LinkedInProfile) {
  return [
    ...profile.certifications,
    ...profile.projects,
    ...profile.featured,
    ...profile.licenses,
    ...profile.volunteer,
    ...profile.publications,
    ...profile.honors,
  ];
}

function validateEvidenceRefsExistLinkedIn(
  profile: LinkedInProfile,
  refs: EvidenceReference[],
): string[] {
  const errors: string[] = [];
  for (const ref of refs) {
    let known = false;
    if (profile.about?.sectionId === ref.sectionId) {
      known = true;
      if (ref.bulletId) {
        const bullet = profile.about.bullets.find((b) => b.bulletId === ref.bulletId);
        if (!bullet) {
          errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
        }
      }
      continue;
    }
    const exp = profile.experience.find((e) => e.sectionId === ref.sectionId);
    if (exp) {
      known = true;
      if (ref.bulletId) {
        const bullet = exp.descriptionBullets.find((b) => b.bulletId === ref.bulletId);
        if (!bullet) {
          errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
        }
      }
      continue;
    }
    const edu = profile.education.find((e) => e.sectionId === ref.sectionId);
    if (edu) {
      known = true;
      if (ref.bulletId) {
        const bullet = edu.descriptionBullets.find((b) => b.bulletId === ref.bulletId);
        if (!bullet) {
          errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
        }
      }
      continue;
    }
    const block = linkedInBlocks(profile).find((b) => b.sectionId === ref.sectionId);
    if (block) {
      known = true;
      if (ref.bulletId) {
        const bullet = block.bullets.find((b) => b.bulletId === ref.bulletId);
        if (!bullet) {
          errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
        }
      }
      continue;
    }
    if (profile.recommendations.some((r) => r.sectionId === ref.sectionId)) {
      known = true;
      continue;
    }
    if (profile.skills.some((s) => s.skillId === ref.sectionId)) {
      known = true;
      continue;
    }
    if (!known) {
      errors.push(`Unknown sectionId: ${ref.sectionId}`);
    }
  }
  return errors;
}

function validateEvidenceRefsExist(
  resume: z.infer<typeof structuredResumeSchema>,
  refs: EvidenceReference[],
): string[] {
  const errors: string[] = [];
  for (const ref of refs) {
    const section = resume.sections.find((s) => s.sectionId === ref.sectionId);
    if (!section) {
      errors.push(`Unknown sectionId: ${ref.sectionId}`);
      continue;
    }
    if (ref.bulletId) {
      const bullet = section.bullets.find((b) => b.bulletId === ref.bulletId);
      if (!bullet) errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
    }
  }
  return errors;
}

function validateEvidenceRefsExistInstagram(
  post: InstagramPost,
  refs: EvidenceReference[],
): string[] {
  const { sectionIds, bulletsBySection } = collectInstagramEvidenceIndex(post);
  const errors: string[] = [];
  for (const ref of refs) {
    if (!sectionIds.has(ref.sectionId)) {
      errors.push(`Unknown sectionId: ${ref.sectionId}`);
      continue;
    }
    if (ref.bulletId) {
      const kids = bulletsBySection.get(ref.sectionId);
      if (!kids?.has(ref.bulletId) && !sectionIds.has(ref.bulletId)) {
        errors.push(`Unknown bulletId ${ref.bulletId} in ${ref.sectionId}`);
      }
    }
  }
  return errors;
}

function validateInstagramInternalRefs(post: InstagramPost): string[] {
  const errors: string[] = [];
  const regionIds = new Set(
    post.mediaItems.flatMap((item) => item.regions.map((r) => r.imageRegionId)),
  );
  const seen = new Set<string>();
  const claimUnique = (id: string, label: string) => {
    if (seen.has(id)) errors.push(`Duplicate ${label}: ${id}`);
    seen.add(id);
  };
  for (const item of post.mediaItems) {
    claimUnique(item.mediaItemId, "mediaItemId");
    for (const region of item.regions) claimUnique(region.imageRegionId, "imageRegionId");
  }
  claimUnique(post.composition.sectionId, "sectionId");
  claimUnique(post.branding.sectionId, "sectionId");
  for (const section of post.caption.sections) claimUnique(section.sectionId, "captionSectionId");
  for (const tag of post.hashtags) claimUnique(tag.hashtagId, "hashtagId");
  for (const entry of post.detectedText) {
    claimUnique(entry.detectedTextId, "detectedTextId");
    if (!regionIds.has(entry.imageRegionId)) {
      errors.push(`Unknown imageRegionId on detectedText ${entry.detectedTextId}: ${entry.imageRegionId}`);
    }
  }
  if (post.composition.focalPointRegionId && !regionIds.has(post.composition.focalPointRegionId)) {
    errors.push(`Unknown focalPointRegionId: ${post.composition.focalPointRegionId}`);
  }
  if (post.branding.logoRegionId && !regionIds.has(post.branding.logoRegionId)) {
    errors.push(`Unknown logoRegionId: ${post.branding.logoRegionId}`);
  }
  return errors;
}

export function validateStructuredInstagram(data: unknown): ValidationOutcome {
  const parsed = structuredInstagramPostSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  const refErrors = validateInstagramInternalRefs(parsed.data);
  if (refErrors.length) {
    return {
      valid: false,
      errorCount: refErrors.length,
      repairAttempted: false,
      errors: refErrors,
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validateStructuredLinkedIn(data: unknown): ValidationOutcome {
  const parsed = structuredLinkedInProfileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validateStructuredResume(data: unknown): ValidationOutcome {
  const parsed = structuredResumeSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validatePersonaAnalysis(
  data: unknown,
  resume: z.infer<typeof structuredResumeSchema>,
): ValidationOutcome {
  const parsed = personaAnalysisSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  const evidenceErrors: string[] = [];
  for (const claim of parsed.data.claims) {
    evidenceErrors.push(...validateEvidenceRefsExist(resume, claim.evidence));
  }
  if (parsed.data.firstImpressionEvidence) {
    evidenceErrors.push(
      ...validateEvidenceRefsExist(resume, parsed.data.firstImpressionEvidence),
    );
  }
  if (evidenceErrors.length) {
    return {
      valid: false,
      errorCount: evidenceErrors.length,
      repairAttempted: false,
      errors: evidenceErrors,
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validatePersonaAnalysisLinkedIn(
  data: unknown,
  profile: LinkedInProfile,
): ValidationOutcome {
  const parsed = personaAnalysisSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  const evidenceErrors: string[] = [];
  for (const claim of parsed.data.claims) {
    evidenceErrors.push(...validateEvidenceRefsExistLinkedIn(profile, claim.evidence));
  }
  if (parsed.data.firstImpressionEvidence) {
    evidenceErrors.push(
      ...validateEvidenceRefsExistLinkedIn(profile, parsed.data.firstImpressionEvidence),
    );
  }
  if (evidenceErrors.length) {
    return {
      valid: false,
      errorCount: evidenceErrors.length,
      repairAttempted: false,
      errors: evidenceErrors,
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validatePersonaAnalysisInstagram(
  data: unknown,
  post: InstagramPost,
): ValidationOutcome {
  const parsed = personaAnalysisSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  const evidenceErrors: string[] = [];
  for (const claim of parsed.data.claims) {
    evidenceErrors.push(...validateEvidenceRefsExistInstagram(post, claim.evidence));
  }
  if (parsed.data.firstImpressionEvidence) {
    evidenceErrors.push(
      ...validateEvidenceRefsExistInstagram(post, parsed.data.firstImpressionEvidence),
    );
  }
  if (evidenceErrors.length) {
    return {
      valid: false,
      errorCount: evidenceErrors.length,
      repairAttempted: false,
      errors: evidenceErrors,
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

export function validateAggregateReport(data: unknown): ValidationOutcome {
  const parsed = aggregateReportSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  return { valid: true, errorCount: 0, repairAttempted: false, errors: [], data: parsed.data };
}

/** #11 — synthesis evidence must exist on resume; sourceClaimIds must exist on persona outputs. */
export function validateAggregateReportEvidence(
  data: unknown,
  resume: z.infer<typeof structuredResumeSchema>,
  personaAnalyses: { personaId: string; claims: { claimId: string }[] }[],
): ValidationOutcome {
  const base = validateAggregateReport(data);
  if (!base.valid || !base.data) return base;

  const report = base.data as z.infer<typeof aggregateReportSchema>;
  const errors: string[] = [];
  const claimIndex = new Map<string, string>();
  for (const p of personaAnalyses) {
    for (const c of p.claims) {
      claimIndex.set(c.claimId, p.personaId);
    }
  }

  for (const syn of report.synthesisClaims) {
    errors.push(...validateEvidenceRefsExist(resume, syn.evidence));
    for (const cid of syn.sourceClaimIds) {
      if (!claimIndex.has(cid)) {
        errors.push(`Unknown sourceClaimId in synthesis: ${cid}`);
      }
    }
    for (const pid of syn.sourcePersonaIds) {
      if (!personaAnalyses.some((p) => p.personaId === pid)) {
        errors.push(`Unknown sourcePersonaId in synthesis: ${pid}`);
      }
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errorCount: errors.length,
      repairAttempted: false,
      errors,
    };
  }
  return base;
}

export function validateAggregateReportEvidenceLinkedIn(
  data: unknown,
  profile: LinkedInProfile,
  personaAnalyses: { personaId: string; claims: { claimId: string }[] }[],
): ValidationOutcome {
  const base = validateAggregateReport(data);
  if (!base.valid || !base.data) return base;

  const report = base.data as z.infer<typeof aggregateReportSchema>;
  const errors: string[] = [];
  const claimIndex = new Map<string, string>();
  for (const p of personaAnalyses) {
    for (const c of p.claims) {
      claimIndex.set(c.claimId, p.personaId);
    }
  }

  for (const syn of report.synthesisClaims) {
    errors.push(...validateEvidenceRefsExistLinkedIn(profile, syn.evidence));
    for (const cid of syn.sourceClaimIds) {
      if (!claimIndex.has(cid)) {
        errors.push(`Unknown sourceClaimId in synthesis: ${cid}`);
      }
    }
    for (const pid of syn.sourcePersonaIds) {
      if (!personaAnalyses.some((p) => p.personaId === pid)) {
        errors.push(`Unknown sourcePersonaId in synthesis: ${pid}`);
      }
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errorCount: errors.length,
      repairAttempted: false,
      errors,
    };
  }
  return base;
}

export function validateAggregateReportEvidenceInstagram(
  data: unknown,
  post: InstagramPost,
  personaAnalyses: { personaId: string; claims: { claimId: string }[] }[],
): ValidationOutcome {
  const base = validateAggregateReport(data);
  if (!base.valid || !base.data) return base;

  const report = base.data as z.infer<typeof aggregateReportSchema>;
  const errors: string[] = [];
  const claimIndex = new Map<string, string>();
  for (const p of personaAnalyses) {
    for (const c of p.claims) {
      claimIndex.set(c.claimId, p.personaId);
    }
  }

  for (const syn of report.synthesisClaims) {
    errors.push(...validateEvidenceRefsExistInstagram(post, syn.evidence));
    for (const cid of syn.sourceClaimIds) {
      if (!claimIndex.has(cid)) {
        errors.push(`Unknown sourceClaimId in synthesis: ${cid}`);
      }
    }
    for (const pid of syn.sourcePersonaIds) {
      if (!personaAnalyses.some((p) => p.personaId === pid)) {
        errors.push(`Unknown sourcePersonaId in synthesis: ${pid}`);
      }
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errorCount: errors.length,
      repairAttempted: false,
      errors,
    };
  }
  return base;
}

const METRIC_RE = /\d+(?:[.,]\d+)?%?|\b\d+[kmb]\b/gi;

export function unsupportedFactWarnings(originalText: string, rewrittenText: string, structuredJson: string): string[] {
  const context = `${originalText}\n${structuredJson}`.toLowerCase();
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const match of rewrittenText.match(METRIC_RE) ?? []) {
    const token = match.toLowerCase();
    if (seen.has(token)) continue;
    seen.add(token);
    if (!context.includes(token)) {
      warnings.push(
        `Rewritten text introduces "${match}", which was not in the original. Confirm this is accurate before using it.`,
      );
    }
  }
  return warnings;
}

export function validateRewriteOutput(
  data: unknown,
  originalText: string,
  structured: unknown,
): ValidationOutcome {
  const parsed = rewriteLlmSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      errorCount: parsed.error.errors.length,
      repairAttempted: false,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }
  if (!parsed.data.rewrittenText.trim()) {
    return {
      valid: false,
      errorCount: 1,
      repairAttempted: false,
      errors: ["rewrittenText is empty"],
    };
  }
  const factWarnings = unsupportedFactWarnings(
    originalText,
    parsed.data.rewrittenText,
    JSON.stringify(structured ?? {}),
  );
  const missing = parsed.data.missingInformation.map(
    (m) => `Stronger results would need additional detail: ${m}`,
  );
  const warnings = [
    ...parsed.data.warnings,
    ...missing,
    ...factWarnings,
  ];
  return {
    valid: true,
    errorCount: 0,
    repairAttempted: false,
    errors: [],
    data: {
      rewrittenText: parsed.data.rewrittenText,
      explanation: parsed.data.explanation,
      warnings,
    },
  };
}

export function validateClaimsEvidence(
  claims: z.infer<typeof insightClaimSchema>[],
  resume: z.infer<typeof structuredResumeSchema>,
): string[] {
  const errors: string[] = [];
  for (const claim of claims) {
    if (!claim.evidence.length) errors.push(`Claim ${claim.claimId} missing evidence`);
    errors.push(...validateEvidenceRefsExist(resume, claim.evidence));
  }
  return errors;
}
