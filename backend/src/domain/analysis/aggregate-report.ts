import type { AiExecutionMetadata } from "./ai-execution.js";
import type { PromptVersions } from "./prompt-versions.js";
import type { ReportDefinition } from "./report-definition.js";
import type { EvidenceReference } from "../shared/evidence.js";

export type PersonaAvailability = {
  personaId: string;
  displayName: string;
  status: "available" | "unavailable";
  reason?: "failed_after_retry" | "validation_failed";
};

export type SynthesisClaim = {
  claimId: string;
  statement: string;
  sourceClaimIds: string[];
  sourcePersonaIds: string[];
  evidence: EvidenceReference[];
};

export type AggregateReport = {
  analysisRunId: string;
  contentVersionId: string;
  executiveSummary: string;
  overallFirstImpression: string;
  consensusThemes: string[];
  conflictingPerspectives: string[];
  personaHeadlines: Record<string, string>;
  synthesisClaims: SynthesisClaim[];
  availability: PersonaAvailability[];
  promptVersions?: PromptVersions;
  reportDefinition?: ReportDefinition;
  aiExecution?: AiExecutionMetadata;
};
