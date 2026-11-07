import type { AiPlatform } from "../../platform/ai/AiPlatform.js";
import { contentAnalyzerRegistry } from "../../platform/analyzers/registry.js";
import type { AnalysisRepository } from "../../infrastructure/db/repositories/analysis.repository.js";
import type { ContentRepository } from "../../infrastructure/db/repositories/content.repository.js";
import type { AiExecutionMetadata } from "../../domain/analysis/ai-execution.js";
import type { PromptVersions } from "../../domain/analysis/prompt-versions.js";
import type {
  RewriteMode,
  RewriteResult,
  RewriteTargetId,
} from "../../domain/rewrite/rewrite-config.js";
import { REWRITE_MODE_CATALOG, rewriteModeById } from "../../domain/rewrite/rewrite-config.js";

export type RewriteRequest = {
  analysisId: string;
  targetId?: string;
  mode: string;
  sectionId?: string;
  bulletId?: string;
  originalText?: string;
};

export type RewriteResponse = RewriteResult & {
  rewriteId: string;
  promptVersions: PromptVersions;
  aiExecution?: AiExecutionMetadata;
};

export class RewriteService {
  constructor(
    private readonly ai: AiPlatform,
    private readonly contents: ContentRepository,
    private readonly analyses: AnalysisRepository,
  ) {}

  catalog() {
    return {
      modes: REWRITE_MODE_CATALOG.map(({ id, label }) => ({ id, label })),
      analyzers: Object.fromEntries(
        contentAnalyzerRegistry.list().map((a) => [
          a.contentType,
          {
            enabled: a.rewrite.enabled,
            targets: a.rewrite.targets,
            modes: a.rewrite.modes,
          },
        ]),
      ),
    };
  }

  async rewrite(userId: string, req: RewriteRequest): Promise<RewriteResponse> {
    const run = await this.analyses.get(req.analysisId, userId);
    if (!run) throw new Error("NOT_FOUND: analysis not found");
    if (!run.contentVersionId) {
      throw new Error("VALIDATION: analysis has no structured content yet");
    }

    const analyzer = contentAnalyzerRegistry.get(run.contentType);
    if (!analyzer.rewrite.enabled) {
      throw new Error("VALIDATION: rewrite is not supported for this content type");
    }

    const version = await this.contents.getVersion(run.contentVersionId, userId);
    const structured = version ? analyzer.extractStructured(version) : undefined;
    if (!structured) throw new Error("VALIDATION: structured content missing");

    const targetId = (req.targetId ||
      analyzer.rewrite.inferTarget({
        structured,
        sectionId: req.sectionId,
        bulletId: req.bulletId,
      })) as RewriteTargetId | undefined;
    if (!targetId || !analyzer.rewrite.targets.some((t) => t.id === targetId)) {
      throw new Error("VALIDATION: unsupported rewrite target");
    }
    if (!rewriteModeById(req.mode) || !analyzer.rewrite.modes.includes(req.mode as RewriteMode)) {
      throw new Error("VALIDATION: unsupported rewrite mode");
    }

    const resolved = analyzer.rewrite.resolve({
      targetId,
      structured,
      sectionId: req.sectionId,
      bulletId: req.bulletId,
      originalText: req.originalText,
    });
    if (!resolved.ok) throw new Error(`VALIDATION: ${resolved.error}`);
    if (!resolved.source.originalText.trim() && targetId !== "hashtags") {
      throw new Error("VALIDATION: original content is empty");
    }

    const personaResults = await this.analyses.listPersonaResults(run.id);
    const report = run.reportId
      ? await this.analyses.getReport(run.reportId, userId)
      : null;

    const result = await this.ai.invoke("rewriteContent", {
      contentType: analyzer.contentType,
      targetId,
      mode: req.mode as RewriteMode,
      originalText: resolved.source.originalText,
      structured,
      sectionId: resolved.source.sectionId,
      bulletId: resolved.source.bulletId,
      personaInsights: personaResults.length
        ? personaResults.map((p) => ({
            personaId: p.personaId,
            displayName: p.personaDisplayName,
            firstImpression: p.firstImpression,
            lensSummary: p.lensSummary,
            claims: p.claims.map((c) => ({
              kind: c.kind,
              statement: c.statement,
            })),
          }))
        : undefined,
      aggregateRecommendations: report
        ? {
            executiveSummary: report.executiveSummary,
            consensusThemes: report.consensusThemes,
            conflictingPerspectives: report.conflictingPerspectives,
          }
        : undefined,
    });

    if (result.status === "failed" || !result.data) {
      throw new Error(result.error?.message ?? "rewrite failed");
    }

    const rewrite: RewriteResult = {
      ...result.data.rewrite,
      warnings: [
        ...resolved.source.warnings,
        ...result.data.rewrite.warnings,
      ],
    };
    const promptVersions = analyzer.promptVersions();
    const rewriteId = await this.analyses.saveRewrite({
      analysisRunId: run.id,
      contentVersionId: run.contentVersionId,
      rewrite,
      promptVersions: {
        rewriteSpecId: promptVersions.rewriteSpecId,
        rewriteSpecVersion: promptVersions.rewriteSpecVersion,
      },
      aiExecution: result.aiExecution,
      executionId: result.executionId,
    });

    if (result.aiExecution) {
      await this.analyses.appendCapabilityExecution(run.id, {
        ...result.aiExecution,
        executionId: result.executionId,
        capabilityId: "rewriteContent",
        recordedAt: new Date(),
      });
    }

    return {
      ...rewrite,
      rewriteId,
      promptVersions,
      aiExecution: result.aiExecution,
    };
  }
}
