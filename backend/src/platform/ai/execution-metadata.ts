import type { AiExecutionMetadata } from "../../domain/analysis/ai-execution.js";
import type { CapabilityResult, CapabilityValidationMeta } from "./CapabilityResult.js";
import type { StructuredCompletionResponse } from "./gateway/LlmGateway.js";
import type { ExecutionRecorder } from "./ports/ExecutionRecorder.js";

export function aiExecutionFromGateway(
  gw: Pick<
    StructuredCompletionResponse,
    "provider" | "model" | "usageUnits" | "promptTokens" | "completionTokens"
  >,
  durationMs: number,
  validation: CapabilityValidationMeta,
  retryCount = 0,
): AiExecutionMetadata {
  return {
    provider: gw.provider ?? "unknown",
    model: gw.model ?? "unknown",
    latencyMs: durationMs,
    tokenUsage: {
      promptTokens: gw.promptTokens,
      completionTokens: gw.completionTokens,
      totalTokens: gw.usageUnits,
    },
    retryCount,
    validationStatus: validation.valid ? "passed" : "failed",
  };
}

export function withAiExecution<T>(
  executions: ExecutionRecorder,
  executionId: string,
  status: string,
  result: CapabilityResult<T>,
  gw?: Pick<
    StructuredCompletionResponse,
    "provider" | "model" | "usageUnits" | "promptTokens" | "completionTokens"
  >,
): CapabilityResult<T> {
  const aiExecution: AiExecutionMetadata = gw
    ? aiExecutionFromGateway(gw, result.durationMs, result.validation)
    : {
        provider: "unknown",
        model: "unknown",
        latencyMs: result.durationMs,
        retryCount: 0,
        validationStatus: result.validation.valid ? "passed" : "failed",
      };
  executions.end(executionId, status, { aiExecution });
  return { ...result, aiExecution };
}
