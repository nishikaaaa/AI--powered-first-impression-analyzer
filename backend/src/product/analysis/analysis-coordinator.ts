import type { PersonaAvailability } from "../../domain/analysis/aggregate-report.js";
import type { AnalysisRun } from "../../domain/analysis/analysis-run.js";
import { env } from "../../config/env.js";
import type { AnalysisRepository } from "../../infrastructure/db/repositories/analysis.repository.js";
import type { PersonaRepository } from "../../infrastructure/db/repositories/persona.repository.js";
import type { NotificationPublisher } from "../../platform/ai/ports/NotificationPublisher.js";
import type { Queue } from "bullmq";

export class AnalysisCoordinator {
  private aggregateScheduled = new Set<string>();

  constructor(
    private readonly analyses: AnalysisRepository,
    private readonly personas: PersonaRepository,
    private readonly notifications: NotificationPublisher,
    private readonly aggregateQueue: Queue,
  ) {}

  async onPersonaFinished(analysisId: string): Promise<void> {
    const run = await this.analyses.getById(analysisId);
    if (!run) return;

    const allTerminal = run.personaSteps.every(
      (s) => s.status === "success" || s.status === "failed",
    );
    if (!allTerminal) return;

    const results = await this.analyses.listPersonaResults(analysisId);
    const successCount = results.length;

    if (successCount < env.minPersonasForAggregate) {
      await this.analyses.update(analysisId, { status: "failed" });
      await this.notifications.publish(`analysis:${analysisId}`, {
        type: "analysis.failed",
        analysisId,
        reason: `Only ${successCount} personas succeeded; need ${env.minPersonasForAggregate}`,
      });
      return;
    }

    if (this.aggregateScheduled.has(analysisId)) return;
    this.aggregateScheduled.add(analysisId);

    if (!run.contentVersionId) {
      await this.analyses.update(analysisId, { status: "failed" });
      return;
    }

    await this.analyses.update(analysisId, { status: "aggregating" });
    await this.aggregateQueue.add(
      "aggregate",
      {
        analysisId,
        contentVersionId: run.contentVersionId,
      },
      { jobId: `aggregate-${analysisId}` },
    );
  }

  buildAvailability(
    run: AnalysisRun,
    personaDisplayNames: Map<string, string>,
  ): PersonaAvailability[] {
    const results = new Set(
      run.personaSteps.filter((s) => s.status === "success").map((s) => s.personaId),
    );
    return run.personaSteps.map((step) => {
      const displayName = personaDisplayNames.get(step.personaId) ?? step.personaId;
      if (results.has(step.personaId)) {
        return { personaId: step.personaId, displayName, status: "available" as const };
      }
      return {
        personaId: step.personaId,
        displayName,
        status: "unavailable" as const,
        reason:
          step.status === "failed"
            ? ("failed_after_retry" as const)
            : ("validation_failed" as const),
      };
    });
  }
}
