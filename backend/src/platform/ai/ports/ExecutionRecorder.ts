export interface ExecutionRecorder {
  start(capabilityId: string, meta?: Record<string, unknown>): string;
  end(executionId: string, status: string, meta?: Record<string, unknown>): void;
}
