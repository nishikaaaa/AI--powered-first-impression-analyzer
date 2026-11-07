export type AnalysisEvent =
  | { type: "analysis.progress"; analysisId: string; status: string; completed: number; total: number }
  | { type: "persona.completed"; analysisId: string; personaId: string; status: string }
  | { type: "report.ready"; analysisId: string; reportId: string; status: string }
  | { type: "analysis.failed"; analysisId: string; reason: string };

export interface NotificationPublisher {
  publish(channel: string, event: AnalysisEvent): Promise<void>;
}
