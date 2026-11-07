export interface EvaluationRunner {
  runSuite(suiteId: string): Promise<{ passed: boolean; message: string }>;
}
