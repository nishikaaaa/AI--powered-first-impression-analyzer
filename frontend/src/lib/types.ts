export type EvidenceReference = {
  sectionId: string;
  bulletId?: string;
  fieldPath?: string;
  excerpt?: string;
};

export type ConfidenceAssessment = {
  aiConfidence: "low" | "medium" | "high";
  aiConfidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong";
  informationCompleteness: "sparse" | "partial" | "sufficient";
  missingInformation?: string[];
};

export type InsightClaim = {
  claimId: string;
  kind: "strength" | "weakness" | "concern" | "recommendation";
  statement: string;
  evidence: EvidenceReference[];
  confidence: ConfidenceAssessment;
};

export type StructuredBullet = {
  bulletId: string;
  text: string;
};

export type StructuredSection = {
  sectionId: string;
  type: string;
  title?: string;
  bullets: StructuredBullet[];
  fields?: Record<string, string>;
};

export type StructuredResume = {
  schemaVersion: "1.0";
  identity: {
    name?: string;
    headline?: string;
    email?: string;
    location?: string;
  };
  sections: StructuredSection[];
};

export type LinkedInBlock = {
  sectionId: string;
  title?: string;
  body?: string;
  bullets: StructuredBullet[];
};

export type LinkedInExperienceItem = {
  sectionId: string;
  title: string;
  company?: string;
  dateRange?: string;
  location?: string;
  descriptionBullets: StructuredBullet[];
};

export type LinkedInEducationItem = {
  sectionId: string;
  school: string;
  degree?: string;
  dateRange?: string;
  descriptionBullets: StructuredBullet[];
};

export type LinkedInSkill = {
  skillId: string;
  name: string;
};

export type LinkedInRecommendation = {
  sectionId: string;
  recommender?: string;
  relationship?: string;
  excerpt: string;
};

export type StructuredLinkedInProfile = {
  schemaVersion: "1.0";
  identity: {
    name?: string;
    headline?: string;
    location?: string;
    industry?: string;
    connectionCount?: string;
    profileUrl?: string;
  };
  about?: LinkedInBlock;
  experience: LinkedInExperienceItem[];
  education: LinkedInEducationItem[];
  skills: LinkedInSkill[];
  certifications: LinkedInBlock[];
  projects: LinkedInBlock[];
  featured: LinkedInBlock[];
  recommendations: LinkedInRecommendation[];
};

export type InstagramImageRegion = {
  imageRegionId: string;
  kind: string;
  label: string;
  description: string;
  position?: { vertical?: string; horizontal?: string };
};

export type InstagramMediaItem = {
  mediaItemId: string;
  mediaType: "image";
  mimeType?: string;
  orientation?: string;
  aspectHint?: string;
  visualStyle?: string;
  regions: InstagramImageRegion[];
};

export type StructuredInstagramPost = {
  schemaVersion: "1.0";
  mediaItems: InstagramMediaItem[];
  composition?: {
    layout?: string;
    lighting?: string;
    colorPalette?: string[];
  };
  branding?: {
    brandName?: string;
    logoVisible?: boolean;
    brandCues?: string;
  };
  detectedText?: { detectedTextId: string; text: string; imageRegionId: string }[];
  caption?: { original: string; normalized: string };
  hashtags?: { hashtagId: string; tag: string }[];
};

export type ContentVersionResponse =
  | {
      contentVersionId: string;
      contentId: string;
      contentType: "resume";
      schemaVersion: string;
      structureSpecId?: string;
      structureSpecVersion?: number;
      structuredResume: StructuredResume;
    }
  | {
      contentVersionId: string;
      contentId: string;
      contentType: "linkedin_profile";
      schemaVersion: string;
      structureSpecId?: string;
      structureSpecVersion?: number;
      structuredLinkedInProfile: StructuredLinkedInProfile;
    }
  | {
      contentVersionId: string;
      contentId: string;
      contentType: "instagram_post";
      schemaVersion: string;
      structureSpecId?: string;
      structureSpecVersion?: number;
      structuredInstagramPost: StructuredInstagramPost;
    };

export type AnalysisRun = {
  id: string;
  userId: string;
  contentId: string;
  contentType?: "resume" | "linkedin_profile" | "instagram_post";
  contentVersionId?: string;
  status: string;
  personaSteps: {
    personaId: string;
    status: string;
    attempts: number;
    error?: string;
  }[];
  reportId?: string;
};

export type PersonaAnalysis = {
  analysisRunId: string;
  personaId: string;
  personaDisplayName: string;
  firstImpression: string;
  firstImpressionEvidence?: EvidenceReference[];
  snapshotSeconds: string;
  claims: InsightClaim[];
  lensSummary: string;
};

export type PersonaAvailability = {
  personaId: string;
  displayName: string;
  status: "available" | "unavailable";
  reason?: string;
};

export type ReportSection = {
  id: string;
  label: string;
};

export type ReportDefinition = {
  sharedSections: ReportSection[];
  extraSections: ReportSection[];
};

export type AggregateReport = {
  analysisRunId: string;
  contentVersionId: string;
  executiveSummary: string;
  overallFirstImpression: string;
  consensusThemes: string[];
  conflictingPerspectives: string[];
  personaHeadlines: Record<string, string>;
  synthesisClaims: {
    claimId: string;
    statement: string;
    sourceClaimIds: string[];
    sourcePersonaIds: string[];
    evidence: EvidenceReference[];
  }[];
  availability: PersonaAvailability[];
  promptVersions?: {
    structureSpecId: string;
    structureSpecVersion: number;
    aggregateSpecId: string;
    aggregateSpecVersion: number;
  };
  reportDefinition?: ReportDefinition;
};

export type RewriteModeOption = {
  id: string;
  label: string;
};

export type RewriteTargetOption = {
  id: string;
  label: string;
  actionLabel: string;
};

export type RewriteActionRequest = {
  targetId?: string;
  sectionId?: string;
  bulletId?: string;
  originalText?: string;
};

export type RewriteResult = {
  rewriteId: string;
  originalText: string;
  rewrittenText: string;
  explanation: string;
  warnings: string[];
  mode: string;
  targetId: string;
  contentType: string;
  sectionId?: string;
  bulletId?: string;
};

export type RewriteCatalog = {
  modes: RewriteModeOption[];
  analyzers: Record<
    string,
    {
      enabled: boolean;
      targets: RewriteTargetOption[];
      modes: string[];
    }
  >;
};

export type AnalysisEvent =
  | { type: "analysis.progress"; analysisId: string; status: string; completed: number; total: number }
  | { type: "persona.completed"; analysisId: string; personaId: string; status: string }
  | { type: "report.ready"; analysisId: string; reportId: string; status: string }
  | { type: "analysis.failed"; analysisId: string; reason: string };
