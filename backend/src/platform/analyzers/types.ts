import type { AiPlatform } from "../ai/AiPlatform.js";
import type { CapabilityId } from "../ai/AiPlatform.js";
import type { CapabilityResult } from "../ai/CapabilityResult.js";
import type { AnalyzePersonaInput } from "../ai/capabilities/analyzePersona.js";
import type { AggregatePerspectivesInput } from "../ai/capabilities/aggregatePerspectives.js";
import type { ValidationOutcome } from "../ai/validation/validateOutput.js";
import type { PromptVersions } from "../../domain/analysis/prompt-versions.js";
import type { ReportDefinition } from "../../domain/analysis/report-definition.js";
import type { PersonaAnalysis } from "../../domain/analysis/persona-analysis.js";
import type { PersonaAvailability } from "../../domain/analysis/aggregate-report.js";
import type { PersonaDefinition } from "../../domain/persona/persona-definition.js";
import type { ContentType } from "../../domain/content/content-type.js";
import type { ContentVersion } from "../../domain/resume/content.js";
import type { RewriteSupport } from "../../domain/rewrite/rewrite-config.js";
import type { ObjectStorage } from "../../infrastructure/storage/storage.port.js";

export type SpecRef = {
  specId: string;
  version: number;
  file: string;
};

export type AnalyzerUploadMeta = {
  kind: "pdf" | "paste" | "image_json";
  accept?: string;
  hint: string;
};

export type FrontendAnalyzerMeta = {
  displayName: string;
  iconKey: string;
  shortLabel: string;
  upload: AnalyzerUploadMeta;
  chooserHref?: string;
  preparingMessage: string;
  failedMessage: string;
};

export type StructureRunOutput = {
  result: CapabilityResult<unknown>;
  schemaVersion: string;
  structured: unknown;
  versionFields: Partial<
    Pick<
      ContentVersion,
      "structuredResume" | "structuredLinkedInProfile" | "structuredInstagramPost"
    >
  >;
};

export type ContentAnalyzerModule = {
  contentType: ContentType;
  structureCapabilityId: CapabilityId;
  specs: {
    structure: SpecRef;
    aggregate: SpecRef;
    rewrite: SpecRef;
    personaFileSuffix: string;
    structuredJsonTag: string;
  };
  supportedPersonaIds: readonly string[];
  frontend: FrontendAnalyzerMeta;
  report: ReportDefinition;
  rewrite: RewriteSupport;
  promptVersions(): PromptVersions;
  extractStructured(version: ContentVersion): unknown | undefined;
  pickStructured(
    input: AnalyzePersonaInput | AggregatePerspectivesInput,
  ): unknown;
  toContentVersionResponse(version: ContentVersion): Record<string, unknown>;
  runStructure(input: {
    ai: AiPlatform;
    storage: ObjectStorage;
    version: ContentVersion;
  }): Promise<StructureRunOutput>;
  analyzePersonaInput(
    analysisRunId: string,
    persona: PersonaDefinition,
    structured: unknown,
  ): AnalyzePersonaInput;
  aggregateInput(input: {
    analysisRunId: string;
    contentVersionId: string;
    structured: unknown;
    personaAnalyses: PersonaAnalysis[];
    availability: PersonaAvailability[];
  }): AggregatePerspectivesInput;
  validatePersona(draft: unknown, structured: unknown): ValidationOutcome;
  validateAggregate(
    draft: unknown,
    structured: unknown,
    personaAnalyses: { personaId: string; claims: { claimId: string }[] }[],
  ): ValidationOutcome;
};
