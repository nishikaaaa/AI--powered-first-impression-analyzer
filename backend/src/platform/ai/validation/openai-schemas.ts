/**
 * JSON Schemas compatible with OpenAI `response_format.json_schema.strict: true`.
 * Optional domain fields are sent as empty strings / empty arrays and stripped in normalizers.
 */

const evidenceRefStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "bulletId", "fieldPath", "excerpt"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    bulletId: { type: "string" },
    fieldPath: { type: "string" },
    excerpt: { type: "string" },
  },
} as const;

const confidenceStrict = {
  type: "object",
  additionalProperties: false,
  required: [
    "aiConfidence",
    "aiConfidenceReason",
    "evidenceStrength",
    "informationCompleteness",
    "missingInformation",
  ],
  properties: {
    aiConfidence: { type: "string", enum: ["low", "medium", "high"] },
    aiConfidenceReason: { type: "string", minLength: 1 },
    evidenceStrength: { type: "string", enum: ["weak", "moderate", "strong"] },
    informationCompleteness: {
      type: "string",
      enum: ["sparse", "partial", "sufficient"],
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const claimStrict = {
  type: "object",
  additionalProperties: false,
  required: ["claimId", "kind", "statement", "evidence", "confidence"],
  properties: {
    claimId: { type: "string", minLength: 1 },
    kind: {
      type: "string",
      enum: ["strength", "weakness", "concern", "recommendation"],
    },
    statement: { type: "string", minLength: 1 },
    evidence: {
      type: "array",
      items: evidenceRefStrict,
      minItems: 1,
    },
    confidence: confidenceStrict,
  },
} as const;

const identityStrict = {
  type: "object",
  additionalProperties: false,
  required: ["name", "headline", "email", "phone", "location"],
  properties: {
    name: { type: "string" },
    headline: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
  },
} as const;

const bulletStrict = {
  type: "object",
  additionalProperties: false,
  required: ["bulletId", "text"],
  properties: {
    bulletId: { type: "string", minLength: 1 },
    text: { type: "string", minLength: 1 },
  },
} as const;

const sectionStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "type", "title", "bullets"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    type: {
      type: "string",
      enum: [
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "other",
      ],
    },
    title: { type: "string" },
    bullets: {
      type: "array",
      items: bulletStrict,
    },
  },
} as const;

export const structuredResumeOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "identity", "sections"],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    identity: identityStrict,
    sections: {
      type: "array",
      items: sectionStrict,
      minItems: 1,
    },
  },
} as const;

export const personaAnalysisOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "firstImpression",
    "firstImpressionEvidence",
    "snapshotSeconds",
    "lensSummary",
    "claims",
  ],
  properties: {
    firstImpression: { type: "string", minLength: 1 },
    firstImpressionEvidence: {
      type: "array",
      items: evidenceRefStrict,
    },
    snapshotSeconds: { type: "string", minLength: 1 },
    lensSummary: { type: "string", minLength: 1 },
    claims: {
      type: "array",
      items: claimStrict,
      minItems: 1,
    },
  },
} as const;

const personaHeadlineEntryStrict = {
  type: "object",
  additionalProperties: false,
  required: ["personaId", "headline"],
  properties: {
    personaId: { type: "string", minLength: 1 },
    headline: { type: "string", minLength: 1 },
  },
} as const;

const synthesisClaimStrict = {
  type: "object",
  additionalProperties: false,
  required: ["claimId", "statement", "sourceClaimIds", "sourcePersonaIds", "evidence"],
  properties: {
    claimId: { type: "string", minLength: 1 },
    statement: { type: "string", minLength: 1 },
    sourceClaimIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
    },
    sourcePersonaIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
    },
    evidence: {
      type: "array",
      items: evidenceRefStrict,
      minItems: 1,
    },
  },
} as const;

export const aggregateOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "overallFirstImpression",
    "consensusThemes",
    "conflictingPerspectives",
    "personaHeadlineEntries",
    "synthesisClaims",
  ],
  properties: {
    executiveSummary: { type: "string", minLength: 1 },
    overallFirstImpression: { type: "string", minLength: 1 },
    consensusThemes: {
      type: "array",
      items: { type: "string" },
    },
    conflictingPerspectives: {
      type: "array",
      items: { type: "string" },
    },
    personaHeadlineEntries: {
      type: "array",
      items: personaHeadlineEntryStrict,
    },
    synthesisClaims: {
      type: "array",
      items: synthesisClaimStrict,
      minItems: 1,
    },
  },
} as const;

const linkedInIdentityStrict = {
  type: "object",
  additionalProperties: false,
  required: ["name", "headline", "location", "industry", "connectionCount", "profileUrl"],
  properties: {
    name: { type: "string" },
    headline: { type: "string" },
    location: { type: "string" },
    industry: { type: "string" },
    connectionCount: { type: "string" },
    profileUrl: { type: "string" },
  },
} as const;

const linkedInBlockStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "title", "body", "bullets"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    title: { type: "string" },
    body: { type: "string" },
    bullets: { type: "array", items: bulletStrict },
  },
} as const;

const linkedInExperienceStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "title", "company", "dateRange", "location", "descriptionBullets"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    company: { type: "string" },
    dateRange: { type: "string" },
    location: { type: "string" },
    descriptionBullets: { type: "array", items: bulletStrict },
  },
} as const;

const linkedInEducationStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "school", "degree", "dateRange", "descriptionBullets"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    school: { type: "string", minLength: 1 },
    degree: { type: "string" },
    dateRange: { type: "string" },
    descriptionBullets: { type: "array", items: bulletStrict },
  },
} as const;

const linkedInSkillStrict = {
  type: "object",
  additionalProperties: false,
  required: ["skillId", "name"],
  properties: {
    skillId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
  },
} as const;

const linkedInRecommendationStrict = {
  type: "object",
  additionalProperties: false,
  required: ["sectionId", "recommender", "relationship", "excerpt"],
  properties: {
    sectionId: { type: "string", minLength: 1 },
    recommender: { type: "string" },
    relationship: { type: "string" },
    excerpt: { type: "string", minLength: 1 },
  },
} as const;

const linkedInLanguageStrict = {
  type: "object",
  additionalProperties: false,
  required: ["languageId", "name"],
  properties: {
    languageId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
  },
} as const;

export const structuredLinkedInOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "identity",
    "about",
    "experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "featured",
    "recommendations",
    "licenses",
    "volunteer",
    "publications",
    "honors",
    "languages",
  ],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    identity: linkedInIdentityStrict,
    about: linkedInBlockStrict,
    experience: { type: "array", items: linkedInExperienceStrict },
    education: { type: "array", items: linkedInEducationStrict },
    skills: { type: "array", items: linkedInSkillStrict },
    certifications: { type: "array", items: linkedInBlockStrict },
    projects: { type: "array", items: linkedInBlockStrict },
    featured: { type: "array", items: linkedInBlockStrict },
    recommendations: { type: "array", items: linkedInRecommendationStrict },
    licenses: { type: "array", items: linkedInBlockStrict },
    volunteer: { type: "array", items: linkedInBlockStrict },
    publications: { type: "array", items: linkedInBlockStrict },
    honors: { type: "array", items: linkedInBlockStrict },
    languages: { type: "array", items: linkedInLanguageStrict },
  },
} as const;

const instagramRegionStrict = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "label", "description", "vertical", "horizontal"],
  properties: {
    kind: {
      type: "string",
      enum: [
        "person",
        "product",
        "logo",
        "text_overlay",
        "scene",
        "object",
        "background",
        "other",
      ],
    },
    label: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    vertical: {
      type: "string",
      enum: ["top", "center", "bottom", "unknown"],
    },
    horizontal: {
      type: "string",
      enum: ["left", "center", "right", "unknown"],
    },
  },
} as const;

const instagramMediaItemStrict = {
  type: "object",
  additionalProperties: false,
  required: ["mediaType", "mimeType", "orientation", "aspectHint", "visualStyle", "regions"],
  properties: {
    mediaType: { type: "string", enum: ["image"] },
    mimeType: { type: "string" },
    orientation: {
      type: "string",
      enum: ["portrait", "landscape", "square", "unknown"],
    },
    aspectHint: { type: "string" },
    visualStyle: { type: "string" },
    regions: {
      type: "array",
      items: instagramRegionStrict,
      minItems: 1,
    },
  },
} as const;

const instagramDetectedTextEntryStrict = {
  type: "object",
  additionalProperties: false,
  required: ["text", "mediaIndex", "regionIndex", "confidence"],
  properties: {
    text: { type: "string" },
    mediaIndex: { type: "string" },
    regionIndex: { type: "string" },
    confidence: { type: "number" },
  },
} as const;

const instagramCompositionStrict = {
  type: "object",
  additionalProperties: false,
  required: ["layout", "lighting", "colorPalette", "focalPointRegionIndex"],
  properties: {
    layout: { type: "string" },
    lighting: { type: "string" },
    colorPalette: { type: "array", items: { type: "string" } },
    focalPointRegionIndex: { type: "string" },
  },
} as const;

const instagramBrandingStrict = {
  type: "object",
  additionalProperties: false,
  required: ["brandName", "logoVisible", "brandCues", "logoRegionIndex"],
  properties: {
    brandName: { type: "string" },
    logoVisible: { type: "string", enum: ["yes", "no", "unknown"] },
    brandCues: { type: "string" },
    logoRegionIndex: { type: "string" },
  },
} as const;

const instagramHashtagStrict = {
  type: "object",
  additionalProperties: false,
  required: ["tag"],
  properties: {
    tag: { type: "string" },
  },
} as const;

export const structuredInstagramOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "mediaItems",
    "composition",
    "branding",
    "detectedText",
    "hashtags",
  ],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    mediaItems: {
      type: "array",
      items: instagramMediaItemStrict,
      minItems: 1,
    },
    composition: instagramCompositionStrict,
    branding: instagramBrandingStrict,
    detectedText: { type: "array", items: instagramDetectedTextEntryStrict },
    hashtags: { type: "array", items: instagramHashtagStrict },
  },
} as const;

/** Names registered with the gateway (stable for logs and tests). */
export const contentRewriteOpenAiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rewrittenText", "explanation", "warnings", "missingInformation"],
  properties: {
    rewrittenText: { type: "string", minLength: 1 },
    explanation: { type: "string", minLength: 1 },
    warnings: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
  },
} as const;

export const OPENAI_SCHEMA_NAMES = {
  structuredResume: "structured_resume_v1",
  structuredLinkedIn: "structured_linkedin_v1",
  structuredInstagram: "structured_instagram_v1",
  personaAnalysis: "persona_analysis_v1",
  aggregateReport: "aggregate_report_v1",
  contentRewrite: "content_rewrite_v1",
} as const;
