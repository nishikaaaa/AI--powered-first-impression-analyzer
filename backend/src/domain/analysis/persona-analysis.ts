import type { AiExecutionMetadata } from "./ai-execution.js";
import type { EvidenceReference, InsightClaim } from "../shared/evidence.js";

export type PersonaAnalysis = {
  analysisRunId: string;
  personaId: string;
  personaDisplayName: string;
  firstImpression: string;
  firstImpressionEvidence?: EvidenceReference[];
  snapshotSeconds: string;
  claims: InsightClaim[];
  lensSummary: string;
  personaSpecId?: string;
  personaSpecVersion?: number;
  aiExecution?: AiExecutionMetadata;
};
