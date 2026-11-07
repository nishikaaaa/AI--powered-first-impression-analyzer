import { randomUUID } from "crypto";
import type { CostRecorder } from "../../../platform/ai/ports/CostRecorder.js";
import type { EvaluationRunner } from "../../../platform/ai/ports/EvaluationRunner.js";
import type { ExecutionRecorder } from "../../../platform/ai/ports/ExecutionRecorder.js";
import type { FeatureFlags } from "../../../platform/ai/ports/FeatureFlags.js";

export class NoOpExecutionRecorder implements ExecutionRecorder {
  start(): string {
    return randomUUID();
  }
  end(): void {}
}

export class NoOpCostRecorder implements CostRecorder {
  record(): void {}
}

export class NoOpFeatureFlags implements FeatureFlags {
  isEnabled(): boolean {
    return true;
  }
}

export class NoOpEvaluationRunner implements EvaluationRunner {
  async runSuite(): Promise<{ passed: boolean; message: string }> {
    return { passed: true, message: "Evaluation runner not configured" };
  }
}
