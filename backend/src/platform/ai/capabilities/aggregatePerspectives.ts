import type { AggregateReport, PersonaAvailability } from "../../../domain/analysis/aggregate-report.js";
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
  aggregateOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizeAggregateFromLlm } from "../validation/openai-normalizers.js";

export type AggregatePerspectivesInput = {
  analysisRunId: string;
  contentVersionId: string;
  personaAnalyses: PersonaAnalysis[];
  availability: PersonaAvailability[];
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

export type AggregatePerspectivesData = {
  aggregateReport: AggregateReport;
};

export class AggregatePerspectivesCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(
    input: AggregatePerspectivesInput,
  ): Promise<CapabilityResult<AggregatePerspectivesData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("aggregatePerspectives");
    const analyzer = contentAnalyzerRegistry.get(input.contentType);

    try {
      const payload = {
        personaAnalyses: input.personaAnalyses,
        unavailable: input.availability.filter((a) => a.status === "unavailable"),
      };

      const messages = await this.ctx.buildAggregateMessages(
        payload,
        input.contentType,
      );
      const gw = await this.gateway.completeStructured({
        purpose: "synthesis",
        qualityTier: "premium",
        messages,
        jsonSchema: aggregateOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.aggregateReport,
      });

      this.costs.record({
        executionId,
        capabilityId: "aggregatePerspectives",
        units: gw.usageUnits,
      });

      const normalized = normalizeAggregateFromLlm(gw.parsed) as {
        personaHeadlines?: Record<string, string>;
      };
      const personaHeadlines: Record<string, string> = {
        ...normalized.personaHeadlines,
      };
      for (const p of input.personaAnalyses) {
        if (!personaHeadlines[p.personaId]) {
          personaHeadlines[p.personaId] = p.firstImpression.slice(0, 120);
        }
      }

      const structured = analyzer.pickStructured(input);
      const draft = {
        ...(normalized as object),
        analysisRunId: input.analysisRunId,
        contentVersionId: input.contentVersionId,
        availability: input.availability,
        personaHeadlines,
      };

      const validation = analyzer.validateAggregate(
        draft,
        structured,
        input.personaAnalyses,
      );
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

      const aggregateReport = validation.data as AggregateReport;
      const evidence = flattenEvidenceFromClaims(
        aggregateReport.synthesisClaims.map((c) => ({ evidence: c.evidence })),
      );

      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { aggregateReport },
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
        error: { code: "INTERNAL", message, retryable: true },
      });
    }
  }
}
