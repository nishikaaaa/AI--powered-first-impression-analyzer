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
