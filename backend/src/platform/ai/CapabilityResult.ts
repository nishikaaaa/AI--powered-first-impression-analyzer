import type { AiExecutionMetadata } from "../../domain/analysis/ai-execution.js";
import type { EvidenceReference } from "../../domain/shared/evidence.js";

export type CapabilityStatus = "success" | "partial" | "failed";

export type CapabilityValidationMeta = {
  valid: boolean;
  errorCount: number;
  repairAttempted: boolean;
};

export type CapabilityError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CapabilityResult<T> = {
  status: CapabilityStatus;
  data?: T;
  warnings: string[];
  evidence: EvidenceReference[];
  executionId: string;
  durationMs: number;
  validation: CapabilityValidationMeta;
  error?: CapabilityError;
  /** Additive execution metadata; omitted by older callers. */
  aiExecution?: AiExecutionMetadata;
};

export function flattenEvidenceFromClaims(
  claims: { evidence: EvidenceReference[] }[],
): EvidenceReference[] {
  const seen = new Set<string>();
  const out: EvidenceReference[] = [];
  for (const c of claims) {
    for (const e of c.evidence) {
      const key = `${e.sectionId}|${e.bulletId ?? ""}|${e.fieldPath ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}
