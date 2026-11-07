export interface CostRecorder {
  record(input: {
    executionId: string;
    capabilityId: string;
    units: number;
    tenantId?: string;
  }): void;
}
