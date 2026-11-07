export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AiExecutionMetadata = {
  provider: string;
  model: string;
  latencyMs: number;
  tokenUsage?: TokenUsage;
  retryCount: number;
  validationStatus: "passed" | "failed" | "skipped";
};

export type AiExecutionRecord = AiExecutionMetadata & {
  executionId: string;
  capabilityId: string;
  recordedAt: Date;
};

export function toAiExecutionRecord(
  capabilityId: string,
  executionId: string,
  meta: AiExecutionMetadata,
): AiExecutionRecord {
  return { ...meta, capabilityId, executionId, recordedAt: new Date() };
}
