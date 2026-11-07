import type { AiExecutionRecord } from "./ai-execution.js";
import type { PromptVersions } from "./prompt-versions.js";
import type { ContentType } from "../content/content-type.js";

export type AnalysisStatus =
  | "queued"
  | "ingesting"
  | "analyzing"
  | "aggregating"
  | "success"
  | "partial"
  | "failed";

export type PersonaStepStatus = "pending" | "running" | "success" | "failed";

export type PersonaStep = {
  personaId: string;
  status: PersonaStepStatus;
  attempts: number;
  error?: string;
};

export type AnalysisRun = {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  contentVersionId?: string;
  status: AnalysisStatus;
  personaSteps: PersonaStep[];
  reportId?: string;
  promptVersions?: PromptVersions;
  capabilityExecutions?: AiExecutionRecord[];
  createdAt: Date;
  updatedAt: Date;
};
