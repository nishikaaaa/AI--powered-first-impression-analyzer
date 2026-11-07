import type { ContentType } from "../../../domain/content/content-type.js";
import type {
  RewriteMode,
  RewriteResult,
  RewriteTargetId,
} from "../../../domain/rewrite/rewrite-config.js";
import { rewriteModeById } from "../../../domain/rewrite/rewrite-config.js";
import { contentAnalyzerRegistry } from "../../analyzers/registry.js";
import { type CapabilityResult } from "../CapabilityResult.js";
import type { ContextBuilder } from "../context/ContextBuilder.js";
import { withAiExecution } from "../execution-metadata.js";
import type { LlmGateway } from "../gateway/LlmGateway.js";
import type { Clock } from "../ports/Clock.js";
import type { CostRecorder } from "../ports/CostRecorder.js";
import type { ExecutionRecorder } from "../ports/ExecutionRecorder.js";
import {
  OPENAI_SCHEMA_NAMES,
  contentRewriteOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizeRewriteFromLlm } from "../validation/openai-normalizers.js";
import { validateRewriteOutput } from "../validation/validateOutput.js";

export type RewriteContentInput = {
  contentType: ContentType;
  targetId: RewriteTargetId;
  mode: RewriteMode;
  originalText: string;
  structured: unknown;
  sectionId?: string;
  bulletId?: string;
  personaInsights?: unknown;
  aggregateRecommendations?: unknown;
};

export type RewriteContentData = {
  rewrite: RewriteResult;
};

export class RewriteContentCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(input: RewriteContentInput): Promise<CapabilityResult<RewriteContentData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("rewriteContent", {
      contentType: input.contentType,
      targetId: input.targetId,
      mode: input.mode,
    });
    const analyzer = contentAnalyzerRegistry.get(input.contentType);
    const mode = rewriteModeById(input.mode);
    const target = analyzer.rewrite.targets.find((t) => t.id === input.targetId);

    try {
      if (!analyzer.rewrite.enabled) {
        throw new Error("Rewrite is not enabled for this content type");
      }
      if (!mode) throw new Error(`Unknown rewrite mode: ${input.mode}`);
      if (!target) throw new Error(`Unsupported rewrite target: ${input.targetId}`);
      if (!analyzer.rewrite.modes.includes(input.mode)) {
        throw new Error(`Rewrite mode not supported: ${input.mode}`);
      }

      const messages = await this.ctx.buildRewriteMessages({
        contentType: input.contentType,
        targetId: input.targetId,
        targetLabel: target.label,
        modeId: mode.id,
        modeLabel: mode.label,
        modeInstruction: mode.instruction,
        originalText: input.originalText,
        structured: input.structured,
        personaInsights: input.personaInsights,
        aggregateRecommendations: input.aggregateRecommendations,
      });

      const gw = await this.gateway.completeStructured({
        purpose: "reasoning",
        qualityTier: "standard",
        messages,
        jsonSchema: contentRewriteOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.contentRewrite,
      });

      this.costs.record({
        executionId,
        capabilityId: "rewriteContent",
        units: gw.usageUnits,
      });

      const validation = validateRewriteOutput(
        normalizeRewriteFromLlm(gw.parsed),
        input.originalText,
        input.structured,
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

      const data = validation.data as {
        rewrittenText: string;
        explanation: string;
        warnings: string[];
      };
      const rewrite: RewriteResult = {
        originalText: input.originalText,
        rewrittenText: data.rewrittenText,
        explanation: data.explanation,
        warnings: data.warnings,
        mode: input.mode,
        targetId: input.targetId,
        contentType: input.contentType,
        sectionId: input.sectionId,
        bulletId: input.bulletId,
      };

      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { rewrite },
          warnings: data.warnings,
          evidence: [],
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
          code: message.startsWith("PROVIDER") ? message.split(":")[0]! : "INTERNAL",
          message,
          retryable: true,
        },
      });
    }
  }
}
