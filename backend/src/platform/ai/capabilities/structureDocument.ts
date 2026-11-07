import type { StructuredResume } from "../../../domain/resume/structured-resume.js";
import { type CapabilityResult } from "../CapabilityResult.js";
import type { ContextBuilder } from "../context/ContextBuilder.js";
import { withAiExecution } from "../execution-metadata.js";
import type { LlmGateway } from "../gateway/LlmGateway.js";
import type { Clock } from "../ports/Clock.js";
import type { CostRecorder } from "../ports/CostRecorder.js";
import type { ExecutionRecorder } from "../ports/ExecutionRecorder.js";
import {
  OPENAI_SCHEMA_NAMES,
  structuredResumeOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizeStructuredResumeFromLlm } from "../validation/openai-normalizers.js";
import { validateStructuredResume } from "../validation/validateOutput.js";

export type StructureDocumentInput = {
  normalizedText: string;
};

export type StructureDocumentData = {
  structuredResume: StructuredResume;
};

export class StructureDocumentCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(input: StructureDocumentInput): Promise<CapabilityResult<StructureDocumentData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("structureDocument");

    try {
      const messages = await this.ctx.buildStructureMessages(input.normalizedText);
      const gw = await this.gateway.completeStructured({
        purpose: "extraction",
        qualityTier: "standard",
        messages,
        jsonSchema: structuredResumeOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.structuredResume,
      });

      this.costs.record({
        executionId,
        capabilityId: "structureDocument",
        units: gw.usageUnits,
      });

      const validation = validateStructuredResume(
        normalizeStructuredResumeFromLlm(gw.parsed),
      );
      if (!validation.valid) {
        return withAiExecution(
          this.executions,
          executionId,
          "failed",
          {
            status: "failed",
            warnings: [],
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

      const structuredResume = validation.data as StructuredResume;
      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { structuredResume },
          warnings: [],
          evidence: [],
          executionId,
          durationMs: this.clock.nowMs() - start,
          validation: {
            valid: true,
            errorCount: 0,
            repairAttempted: false,
          },
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
