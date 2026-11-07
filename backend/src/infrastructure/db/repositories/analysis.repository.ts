import { ObjectId, type Db } from "mongodb";
import type { AiExecutionMetadata, AiExecutionRecord } from "../../../domain/analysis/ai-execution.js";
import type { AggregateReport } from "../../../domain/analysis/aggregate-report.js";
import type { RewriteResult } from "../../../domain/rewrite/rewrite-config.js";
import type { PromptVersions } from "../../../domain/analysis/prompt-versions.js";
import type { ContentType } from "../../../domain/content/content-type.js";
import type { AnalysisRun, PersonaStep } from "../../../domain/analysis/analysis-run.js";
import type { PersonaAnalysis } from "../../../domain/analysis/persona-analysis.js";

type AnalysisDoc = {
  _id: ObjectId;
  userId: string;
  contentId: ObjectId;
  contentType?: ContentType;
  contentVersionId?: ObjectId;
  status: AnalysisRun["status"];
  personaSteps: AnalysisRun["personaSteps"];
  reportId?: ObjectId;
  promptVersions?: PromptVersions;
  capabilityExecutions?: AiExecutionRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export class AnalysisRepository {
  constructor(private readonly db: Db) {}

  private analyses() {
    return this.db.collection<AnalysisDoc>("analyses");
  }

  private personaResults() {
    return this.db.collection("persona_results");
  }

  private reports() {
    return this.db.collection("reports");
  }

  private rewrites() {
    return this.db.collection("rewrites");
  }

  async create(run: Omit<AnalysisRun, "id" | "createdAt" | "updatedAt">): Promise<AnalysisRun> {
    const now = new Date();
    const doc: AnalysisDoc = {
      _id: new ObjectId(),
      userId: run.userId,
      contentId: new ObjectId(run.contentId),
      contentType: run.contentType,
      contentVersionId: run.contentVersionId
        ? new ObjectId(run.contentVersionId)
        : undefined,
      status: run.status,
      personaSteps: run.personaSteps,
      reportId: run.reportId ? new ObjectId(run.reportId) : undefined,
      promptVersions: run.promptVersions,
      capabilityExecutions: run.capabilityExecutions ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await this.analyses().insertOne(doc);
    return { ...run, id: doc._id.toHexString(), createdAt: now, updatedAt: now };
  }

  async get(id: string, userId: string): Promise<AnalysisRun | null> {
    const doc = await this.analyses().findOne({ _id: new ObjectId(id), userId });
    if (!doc) return null;
    return this.toRun(doc);
  }

  async getById(id: string): Promise<AnalysisRun | null> {
    const doc = await this.analyses().findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.toRun(doc);
  }

  async update(id: string, patch: Partial<AnalysisRun>): Promise<void> {
    const set: Partial<AnalysisDoc> = { updatedAt: new Date() };
    if (patch.status) set.status = patch.status;
    if (patch.contentVersionId) set.contentVersionId = new ObjectId(patch.contentVersionId);
    if (patch.personaSteps) set.personaSteps = patch.personaSteps;
    if (patch.reportId) set.reportId = new ObjectId(patch.reportId);
    if (patch.promptVersions) set.promptVersions = patch.promptVersions;
    if (patch.capabilityExecutions) set.capabilityExecutions = patch.capabilityExecutions;
    await this.analyses().updateOne({ _id: new ObjectId(id) }, { $set: set });
  }

  async appendCapabilityExecution(
    analysisId: string,
    record: AiExecutionRecord,
  ): Promise<void> {
    await this.analyses().updateOne(
      { _id: new ObjectId(analysisId) },
      {
        $push: { capabilityExecutions: record },
        $set: { updatedAt: new Date() },
      },
    );
  }

  /** #5 — single persona step update without read-modify-write on the full array. */
  async updatePersonaStep(
    analysisId: string,
    personaId: string,
    patch: Partial<Pick<PersonaStep, "status" | "attempts" | "error">>,
  ): Promise<void> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.status !== undefined) set["personaSteps.$.status"] = patch.status;
    if (patch.attempts !== undefined) set["personaSteps.$.attempts"] = patch.attempts;
    if (patch.error !== undefined) set["personaSteps.$.error"] = patch.error;
    await this.analyses().updateOne(
      { _id: new ObjectId(analysisId), "personaSteps.personaId": personaId },
      { $set: set },
    );
  }

  async savePersonaResult(result: PersonaAnalysis): Promise<void> {
    await this.personaResults().updateOne(
      { analysisRunId: result.analysisRunId, personaId: result.personaId },
      { $set: { ...result, updatedAt: new Date() } },
      { upsert: true },
    );
  }

  async listPersonaResults(analysisRunId: string): Promise<PersonaAnalysis[]> {
    const docs = await this.personaResults()
      .find({ analysisRunId })
      .toArray();
    return docs as unknown as PersonaAnalysis[];
  }

  /** #6 — one report document per analysisRunId. */
  async saveReport(report: AggregateReport): Promise<string> {
    const existing = await this.reports().findOne({ analysisRunId: report.analysisRunId });
    if (existing?._id) {
      return existing._id.toHexString();
    }
    const _id = new ObjectId();
    try {
      await this.reports().insertOne({ _id, ...report, createdAt: new Date() });
      return _id.toHexString();
    } catch (e) {
      const dup = await this.reports().findOne({ analysisRunId: report.analysisRunId });
      if (dup?._id) return dup._id.toHexString();
      throw e;
    }
  }

  async findReportIdByAnalysisRunId(analysisRunId: string): Promise<string | null> {
    const doc = await this.reports().findOne({ analysisRunId });
    return doc?._id?.toHexString() ?? null;
  }

  async getReport(id: string, userId: string): Promise<AggregateReport | null> {
    const doc = await this.reports().findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    const analysisRunId = doc.analysisRunId as string;
    const analysis = await this.analyses().findOne({
      _id: new ObjectId(analysisRunId),
      userId,
    });
    if (!analysis) return null;
    const { _id, createdAt, ...report } = doc as AggregateReport & {
      _id: ObjectId;
      createdAt: Date;
    };
    void _id;
    void createdAt;
    return report as AggregateReport;
  }

  async saveRewrite(input: {
    analysisRunId: string;
    contentVersionId: string;
    rewrite: RewriteResult;
    promptVersions?: Pick<PromptVersions, "rewriteSpecId" | "rewriteSpecVersion">;
    aiExecution?: AiExecutionMetadata;
    executionId: string;
  }): Promise<string> {
    const _id = new ObjectId();
    await this.rewrites().insertOne({
      _id,
      ...input,
      createdAt: new Date(),
    });
    return _id.toHexString();
  }

  private toRun(doc: AnalysisDoc): AnalysisRun {
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      contentId: doc.contentId.toHexString(),
      contentType: doc.contentType ?? "resume",
      contentVersionId: doc.contentVersionId?.toHexString(),
      status: doc.status,
      personaSteps: doc.personaSteps,
      reportId: doc.reportId?.toHexString(),
      promptVersions: doc.promptVersions,
      capabilityExecutions: doc.capabilityExecutions,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
