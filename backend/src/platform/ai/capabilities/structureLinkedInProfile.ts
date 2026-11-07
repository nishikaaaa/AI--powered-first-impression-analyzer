import type { StructuredLinkedInProfile } from "../../../domain/linkedin/structured-linkedin-profile.js";
import { type CapabilityResult } from "../CapabilityResult.js";
import type { ContextBuilder } from "../context/ContextBuilder.js";
import { withAiExecution } from "../execution-metadata.js";
import type { LlmGateway } from "../gateway/LlmGateway.js";
import type { Clock } from "../ports/Clock.js";
import type { CostRecorder } from "../ports/CostRecorder.js";
import type { ExecutionRecorder } from "../ports/ExecutionRecorder.js";
import {
  OPENAI_SCHEMA_NAMES,
  structuredLinkedInOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizeStructuredLinkedInFromLlm } from "../validation/openai-normalizers.js";
import { validateStructuredLinkedIn } from "../validation/validateOutput.js";

export type StructureLinkedInProfileInput = {
  normalizedText: string;
};

export type StructureLinkedInProfileData = {
  structuredLinkedInProfile: StructuredLinkedInProfile;
};

export class StructureLinkedInProfileCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(
    input: StructureLinkedInProfileInput,
  ): Promise<CapabilityResult<StructureLinkedInProfileData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("structureLinkedInProfile");

    try {
      const messages = await this.ctx.buildLinkedInStructureMessages(input.normalizedText);
      const gw = await this.gateway.completeStructured({
        purpose: "extraction",
        qualityTier: "standard",
        messages,
        jsonSchema: structuredLinkedInOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.structuredLinkedIn,
      });

      this.costs.record({
        executionId,
        capabilityId: "structureLinkedInProfile",
        units: gw.usageUnits,
      });

      const validation = validateStructuredLinkedIn(
        normalizeStructuredLinkedInFromLlm(gw.parsed),
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

      const structuredLinkedInProfile = validation.data as StructuredLinkedInProfile;
      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { structuredLinkedInProfile },
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
