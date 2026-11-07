import { z } from "zod";

export const evidenceRefSchema = z.object({
  sectionId: z.string().min(1),
  bulletId: z.string().optional(),
  fieldPath: z.string().optional(),
  excerpt: z.string().optional(),
});

export const confidenceSchema = z.object({
  aiConfidence: z.enum(["low", "medium", "high"]),
  aiConfidenceReason: z.string().min(1),
  evidenceStrength: z.enum(["weak", "moderate", "strong"]),
  informationCompleteness: z.enum(["sparse", "partial", "sufficient"]),
  missingInformation: z.array(z.string()).optional(),
});

export const insightClaimSchema = z.object({
  claimId: z.string().min(1),
  kind: z.enum(["strength", "weakness", "concern", "recommendation"]),
  statement: z.string().min(1),
  evidence: z.array(evidenceRefSchema).min(1),
  confidence: confidenceSchema,
});

export const structuredBulletSchema = z.object({
  bulletId: z.string().min(1),
  text: z.string().min(1),
  sourceSpan: z
    .object({
      charStart: z.number().int().nonnegative(),
      charEnd: z.number().int().nonnegative(),
    })
    .optional(),
});

export const structuredSectionSchema = z.object({
  sectionId: z.string().min(1),
  type: z.enum([
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "other",
  ]),
  title: z.string().optional(),
  bullets: z.array(structuredBulletSchema),
  fields: z.record(z.string()).optional(),
});

export const structuredResumeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  identity: z.object({
    name: z.string().optional(),
    headline: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  sections: z.array(structuredSectionSchema).min(1),
});

export const personaAnalysisSchema = z.object({
  analysisRunId: z.string(),
  personaId: z.string(),
  personaDisplayName: z.string(),
  firstImpression: z.string().min(1),
  firstImpressionEvidence: z.array(evidenceRefSchema).optional(),
  snapshotSeconds: z.string().min(1),
  claims: z.array(insightClaimSchema).min(1),
  lensSummary: z.string().min(1),
});

export const aggregateReportSchema = z.object({
  analysisRunId: z.string(),
  contentVersionId: z.string(),
  executiveSummary: z.string().min(1),
  overallFirstImpression: z.string().min(1),
  consensusThemes: z.array(z.string()),
  conflictingPerspectives: z.array(z.string()),
  personaHeadlines: z.record(z.string()),
  synthesisClaims: z.array(
    z.object({
      claimId: z.string(),
      statement: z.string(),
      sourceClaimIds: z.array(z.string()).min(1),
      sourcePersonaIds: z.array(z.string()).min(1),
      evidence: z.array(evidenceRefSchema).min(1),
    }),
  ),
  availability: z.array(
    z.object({
      personaId: z.string(),
      displayName: z.string(),
      status: z.enum(["available", "unavailable"]),
      reason: z.enum(["failed_after_retry", "validation_failed"]).optional(),
    }),
  ),
});
