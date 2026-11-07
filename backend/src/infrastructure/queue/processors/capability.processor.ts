import type { Job } from "bullmq";
import type { Container } from "../../../composition/create-container.js";
import { toAiExecutionRecord } from "../../../domain/analysis/ai-execution.js";
import type { AnalysisRun } from "../../../domain/analysis/analysis-run.js";
import type { CapabilityResult } from "../../../platform/ai/CapabilityResult.js";
import { contentAnalyzerRegistry } from "../../../platform/analyzers/registry.js";
import type {
  AggregateJob,
  PersonaJob,
  StructureJob,
} from "../job-names.js";

export function createCapabilityProcessor(container: Container) {
  const {
    ai,
    contents,
    analyses,
    personas,
    coordinator,
    notifications,
    logger,
    capabilityQueue,
    storage,
  } = container;

  return async (job: Job<StructureJob | PersonaJob | AggregateJob>) => {
    if (job.name === "structure") {
      await handleStructure(job as Job<StructureJob>);
    } else if (job.name === "persona") {
      await handlePersona(job as Job<PersonaJob>);
    } else if (job.name === "aggregate") {
      await handleAggregate(job as Job<AggregateJob>);
    }
  };

  async function recordExecution(
    analysisId: string,
    capabilityId: string,
    result: CapabilityResult<unknown>,
    retryCount: number,
  ) {
    if (!result.aiExecution) return;
    await analyses.appendCapabilityExecution(
      analysisId,
      toAiExecutionRecord(capabilityId, result.executionId, {
        ...result.aiExecution,
        retryCount,
      }),
    );
  }

  async function enqueuePersonaJobs(run: AnalysisRun, contentVersionId: string) {
    for (const step of run.personaSteps) {
      await capabilityQueue.add(
        "persona",
        {
          analysisId: run.id,
          contentVersionId,
          personaId: step.personaId,
        },
        {
          jobId: `persona-${run.id}-${step.personaId}`,
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
        },
      );
    }
    await notifications.publish(`analysis:${run.id}`, {
      type: "analysis.progress",
      analysisId: run.id,
      status: "analyzing",
      completed: 0,
      total: run.personaSteps.length,
    });
  }

  async function handleStructure(job: Job<StructureJob>) {
    const { analysisId, contentId, normalizedVersionId } = job.data;
    const started = Date.now();
    logger.info("capability job start", {
      job: "structure",
      analysisId,
      contentVersionId: normalizedVersionId,
    });

    const run = await analyses.getById(analysisId);
    if (!run) return;

    // #7 — analysis already linked to structured version (structure retry)
    if (run.contentVersionId) {
      logger.info("structure skipped idempotent", {
        analysisId,
        contentVersionId: run.contentVersionId,
      });
      await enqueuePersonaJobs(run, run.contentVersionId);
      logger.info("capability job done", {
        job: "structure",
        analysisId,
        durationMs: Date.now() - started,
        status: "skipped",
      });
      return;
    }

    const version = await contents.getVersionById(normalizedVersionId);
    if (!version?.normalizedText) throw new Error("Normalized version missing text");

    const existingStructured = await contents.findStructuredByParent(
      contentId,
      normalizedVersionId,
    );
    if (existingStructured) {
      await analyses.update(analysisId, {
        status: "analyzing",
        contentVersionId: existingStructured.id,
      });
      const refreshed = await analyses.getById(analysisId);
      if (refreshed) await enqueuePersonaJobs(refreshed, existingStructured.id);
      logger.info("capability job done", {
        job: "structure",
        analysisId,
        contentVersionId: existingStructured.id,
        durationMs: Date.now() - started,
        status: "reused_structured",
      });
      return;
    }

    const analyzer = contentAnalyzerRegistry.get(run.contentType ?? "resume");
    const { result: structureResult, schemaVersion, structured, versionFields } =
      await analyzer.runStructure({ ai, storage, version });

    await recordExecution(
      analysisId,
      analyzer.structureCapabilityId,
      structureResult,
      job.attemptsMade,
    );

    if (structureResult.status === "failed" || !structured) {
      await analyses.update(analysisId, { status: "failed" });
      await notifications.publish(`analysis:${analysisId}`, {
        type: "analysis.failed",
        analysisId,
        reason: structureResult.error?.message ?? "structure failed",
      });
      logger.error("capability job failed", {
        job: "structure",
        analysisId,
        contentType: analyzer.contentType,
        executionId: structureResult.executionId,
        durationMs: Date.now() - started,
        error: structureResult.error?.message,
      });
      throw new Error(structureResult.error?.message ?? "structure failed");
    }

    const promptVersions = analyzer.promptVersions();
    const structuredVersion = await contents.insertVersion({
      contentId,
      kind: "structured",
      parentContentVersionId: normalizedVersionId,
      schemaVersion,
      structureSpecId: promptVersions.structureSpecId,
      structureSpecVersion: promptVersions.structureSpecVersion,
      ...versionFields,
    });

    await analyses.update(analysisId, {
      status: "analyzing",
      contentVersionId: structuredVersion.id,
      promptVersions: run.promptVersions ?? promptVersions,
    });

    const refreshed = await analyses.getById(analysisId);
    if (refreshed) {
      // #3 — fan-out from pinned personaSteps, not live registry
      await enqueuePersonaJobs(refreshed, structuredVersion.id);
    }

    logger.info("capability job done", {
      job: "structure",
      analysisId,
      contentVersionId: structuredVersion.id,
      executionId: structureResult.executionId,
      durationMs: Date.now() - started,
      status: "success",
    });
  }

  async function handlePersona(job: Job<PersonaJob>) {
    const { analysisId, contentVersionId, personaId } = job.data;
    const started = Date.now();
    logger.info("capability job start", {
      job: "persona",
      analysisId,
      contentVersionId,
      personaId,
      attempt: job.attemptsMade + 1,
    });

    const run = await analyses.getById(analysisId);
    if (!run) return;

    const persona = await personas.getById(personaId);
    if (!persona) throw new Error(`Unknown persona ${personaId}`);

    const version = await contents.getVersionById(contentVersionId);
    const analyzer = contentAnalyzerRegistry.get(run.contentType ?? "resume");
    const structured = version ? analyzer.extractStructured(version) : undefined;
    if (!structured) throw new Error("Structured version missing");

    // #5 — atomic step update
    await analyses.updatePersonaStep(analysisId, personaId, {
      status: "running",
      attempts: job.attemptsMade + 1,
    });

    const result = await ai.invoke(
      "analyzePersona",
      analyzer.analyzePersonaInput(analysisId, persona, structured),
    );

    await recordExecution(
      analysisId,
      "analyzePersona",
      result,
      job.attemptsMade,
    );

    const maxAttempts = job.opts.attempts ?? 1;
    const terminal = job.attemptsMade + 1 >= maxAttempts;

    if (result.status !== "failed" && result.data && result.validation.valid) {
      await analyses.savePersonaResult({
        ...result.data.personaAnalysis,
        personaSpecId: persona.contextSpecId,
        personaSpecVersion: persona.contextSpecVersion,
        aiExecution: result.aiExecution
          ? { ...result.aiExecution, retryCount: job.attemptsMade }
          : undefined,
      });
      await analyses.updatePersonaStep(analysisId, personaId, { status: "success" });
      await notifications.publish(`analysis:${analysisId}`, {
        type: "persona.completed",
        analysisId,
        personaId,
        status: "success",
      });
      logger.info("capability job done", {
        job: "persona",
        analysisId,
        personaId,
        contentVersionId,
        executionId: result.executionId,
        durationMs: Date.now() - started,
        status: "success",
      });
    } else if (terminal) {
      await analyses.updatePersonaStep(analysisId, personaId, {
        status: "failed",
        error: result.error?.message ?? "validation failed",
      });
      await notifications.publish(`analysis:${analysisId}`, {
        type: "persona.completed",
        analysisId,
        personaId,
        status: "failed",
      });
      logger.warn("capability job done", {
        job: "persona",
        analysisId,
        personaId,
        executionId: result.executionId,
        durationMs: Date.now() - started,
        status: "failed",
      });
    } else {
      logger.warn("capability job retry", {
        job: "persona",
        analysisId,
        personaId,
        executionId: result.executionId,
        durationMs: Date.now() - started,
      });
      throw new Error(result.error?.message ?? "persona retry");
    }

    const refreshed = await analyses.getById(analysisId);
    if (refreshed) {
      const completed = refreshed.personaSteps.filter(
        (s) => s.status === "success" || s.status === "failed",
      ).length;
      await notifications.publish(`analysis:${analysisId}`, {
        type: "analysis.progress",
        analysisId,
        status: refreshed.status,
        completed,
        total: refreshed.personaSteps.length,
      });
    }

    await coordinator.onPersonaFinished(analysisId);
  }

  async function handleAggregate(job: Job<AggregateJob>) {
    const { analysisId, contentVersionId } = job.data;
    const started = Date.now();
    logger.info("capability job start", {
      job: "aggregate",
      analysisId,
      contentVersionId,
    });

    const run = await analyses.getById(analysisId);
    if (!run) return;

    // #6 — idempotent aggregate
    if (run.reportId) {
      logger.info("aggregate skipped idempotent", {
        analysisId,
        reportId: run.reportId,
      });
      return;
    }

    const existingReportId = await analyses.findReportIdByAnalysisRunId(analysisId);
    if (existingReportId) {
      await analyses.update(analysisId, { reportId: existingReportId });
      logger.info("aggregate linked existing report", {
        analysisId,
        reportId: existingReportId,
      });
      return;
    }

    const version = await contents.getVersionById(contentVersionId);
    const analyzer = contentAnalyzerRegistry.get(run.contentType ?? "resume");
    const structured = version ? analyzer.extractStructured(version) : undefined;
    if (!structured) throw new Error("Structured version missing");

    const personaAnalyses = await analyses.listPersonaResults(analysisId);
    const defs = await personas.listEnabled(analyzer.contentType);
    const names = new Map(defs.map((d) => [d.id, d.displayName]));
    const availability = coordinator.buildAvailability(run, names);

    const result = await ai.invoke(
      "aggregatePerspectives",
      analyzer.aggregateInput({
        analysisRunId: analysisId,
        contentVersionId,
        structured,
        personaAnalyses,
        availability,
      }),
    );

    await recordExecution(
      analysisId,
      "aggregatePerspectives",
      result,
      job.attemptsMade,
    );

    if (result.status === "failed" || !result.data) {
      await analyses.update(analysisId, { status: "failed" });
      logger.error("capability job failed", {
        job: "aggregate",
        analysisId,
        executionId: result.executionId,
        durationMs: Date.now() - started,
        error: result.error?.message,
      });
      throw new Error(result.error?.message ?? "aggregate failed");
    }

    const promptVersions = run.promptVersions ?? analyzer.promptVersions();
    const reportId = await analyses.saveReport({
      ...result.data.aggregateReport,
      promptVersions,
      reportDefinition: analyzer.report,
      aiExecution: result.aiExecution
        ? { ...result.aiExecution, retryCount: job.attemptsMade }
        : undefined,
    });
    const hasUnavailable = availability.some((a) => a.status === "unavailable");
    await analyses.update(analysisId, {
      status: hasUnavailable ? "partial" : "success",
      reportId,
    });

    await notifications.publish(`analysis:${analysisId}`, {
      type: "report.ready",
      analysisId,
      reportId,
      status: hasUnavailable ? "partial" : "success",
    });

    logger.info("capability job done", {
      job: "aggregate",
      analysisId,
      contentVersionId,
      reportId,
      executionId: result.executionId,
      durationMs: Date.now() - started,
      status: hasUnavailable ? "partial" : "success",
    });
  }
}

/** #4 — reset persona step when BullMQ marks a job stalled (worker crash / lost lock). */
export async function recoverPersonaStepFromJob(
  container: Container,
  job: Job | undefined,
  outcome: "stalled" | "failed",
): Promise<void> {
  if (!job || job.name !== "persona") return;
  const { analysisId, personaId } = job.data as PersonaJob;
  const maxAttempts = job.opts.attempts ?? 1;
  const terminal = job.attemptsMade >= maxAttempts;

  if (outcome === "stalled") {
    await container.analyses.updatePersonaStep(analysisId, personaId, {
      status: "pending",
    });
    container.logger.warn("persona step recovered from stalled", {
      analysisId,
      personaId,
    });
    return;
  }

  if (terminal) {
    await container.analyses.updatePersonaStep(analysisId, personaId, {
      status: "failed",
      error: "job_failed_after_retries",
    });
    container.logger.warn("persona step marked failed after job failure", {
      analysisId,
      personaId,
    });
    await container.coordinator.onPersonaFinished(analysisId);
    return;
  }

  await container.analyses.updatePersonaStep(analysisId, personaId, {
    status: "pending",
  });
  container.logger.warn("persona step reset pending after failed attempt", {
    analysisId,
    personaId,
  });
}
