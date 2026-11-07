import type { PersonaDefinition } from "../../../domain/persona/persona-definition.js";
import type { PersonaAnalysis } from "../../../domain/analysis/persona-analysis.js";
import type { StructuredInstagramPost } from "../../../domain/instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../../../domain/linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "../../../domain/resume/structured-resume.js";
import { contentAnalyzerRegistry } from "../../analyzers/registry.js";
import {
  type CapabilityResult,
  flattenEvidenceFromClaims,
} from "../CapabilityResult.js";
import type { ContextBuilder } from "../context/ContextBuilder.js";
import { withAiExecution } from "../execution-metadata.js";
import type { LlmGateway } from "../gateway/LlmGateway.js";
import type { Clock } from "../ports/Clock.js";
import type { CostRecorder } from "../ports/CostRecorder.js";
import type { ExecutionRecorder } from "../ports/ExecutionRecorder.js";
import {
  OPENAI_SCHEMA_NAMES,
  personaAnalysisOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizePersonaAnalysisFromLlm } from "../validation/openai-normalizers.js";

export type AnalyzePersonaInput = {
  analysisRunId: string;
  persona: PersonaDefinition;
} & (
  | { contentType: "resume"; structuredResume: StructuredResume }
  | {
      contentType: "linkedin_profile";
      structuredLinkedInProfile: StructuredLinkedInProfile;
    }
  | {
      contentType: "instagram_post";
      structuredInstagramPost: StructuredInstagramPost;
    }
);

export type AnalyzePersonaData = {
  personaAnalysis: PersonaAnalysis;
};

export class AnalyzePersonaCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(input: AnalyzePersonaInput): Promise<CapabilityResult<AnalyzePersonaData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("analyzePersona", {
      personaId: input.persona.id,
    });
    const analyzer = contentAnalyzerRegistry.get(input.contentType);

    try {
      const structured = analyzer.pickStructured(input);
      const messages = await this.ctx.buildPersonaMessages(
        input.persona.contextSpecId,
        input.persona.contextSpecVersion,
        input.persona.displayName,
        input.contentType,
        structured as StructuredResume | StructuredLinkedInProfile | StructuredInstagramPost,
      );

      const gw = await this.gateway.completeStructured({
        purpose: "reasoning",
        qualityTier: input.persona.qualityTier,
        messages,
        jsonSchema: personaAnalysisOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.personaAnalysis,
      });

      this.costs.record({
        executionId,
        capabilityId: "analyzePersona",
        units: gw.usageUnits,
      });

      const normalized = normalizePersonaAnalysisFromLlm(gw.parsed);
      const draft = {
        ...(normalized as object),
        analysisRunId: input.analysisRunId,
        personaId: input.persona.id,
        personaDisplayName: input.persona.displayName,
        personaSpecId: input.persona.contextSpecId,
        personaSpecVersion: input.persona.contextSpecVersion,
      };

      const validation = analyzer.validatePersona(draft, structured);
      if (!validation.valid) {
        return withAiExecution(
          this.executions,
          executionId,
          "failed",
          {
            status: "failed",
            warnings: validation.errors,
            evidence: [],
            executionId,
            durationMs: this.clock.nowMs() - start,
            validation: {
              valid: false,
              errorCount: validation.errorCount,
              repairAttempted: false,
            },
            error: {
              code: "VALIDATION_FAILED",
              message: validation.errors.join("; "),
              retryable: true,
            },
          },
          gw,
        );
      }

      const personaAnalysis = validation.data as PersonaAnalysis;
      const evidence = flattenEvidenceFromClaims(personaAnalysis.claims);
      if (personaAnalysis.firstImpressionEvidence) {
        evidence.push(...personaAnalysis.firstImpressionEvidence);
      }

      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { personaAnalysis },
          warnings: [],
          evidence,
          executionId,
          durationMs: this.clock.nowMs() - start,
          validation: { valid: true, errorCount: 0, repairAttempted: false },
        },
        gw,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return withAiExecution(this.executions, executionId, "failed", {
        status: "failed",
        warnings: [],
        evidence: [],
        executionId,
        durationMs: this.clock.nowMs() - start,
        validation: { valid: false, errorCount: 1, repairAttempted: false },
        error: {
          code: "INTERNAL",
          message,
          retryable: true,
        },
      });
    }
  }
}
