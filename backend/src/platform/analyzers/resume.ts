import type { AiPlatform } from "../ai/AiPlatform.js";
import { reportDefinition } from "../../domain/analysis/report-definition.js";
import type { StructuredResume } from "../../domain/resume/structured-resume.js";
import type { ContentVersion } from "../../domain/resume/content.js";
import {
  validateAggregateReportEvidence,
  validatePersonaAnalysis,
} from "../ai/validation/validateOutput.js";
import {
  ALL_REWRITE_MODES,
  RESUME_REWRITE_TARGETS,
} from "../../domain/rewrite/rewrite-config.js";
import { inferResumeTarget, resolveResumeRewrite } from "./rewrite-resolve.js";
import type { ContentAnalyzerModule, StructureRunOutput } from "./types.js";

export const resumeAnalyzer: ContentAnalyzerModule = {
  contentType: "resume",
  structureCapabilityId: "structureDocument",
  specs: {
    structure: {
      specId: "structure/resume",
      version: 1,
      file: "structure-resume.system.md",
    },
    aggregate: {
      specId: "aggregate/resume",
      version: 1,
      file: "aggregate.system.md",
    },
    rewrite: {
      specId: "rewrite/resume",
      version: 1,
      file: "rewrite/resume.v1.md",
    },
    personaFileSuffix: "",
    structuredJsonTag: "structured_resume_json",
  },
  rewrite: {
    enabled: true,
    targets: RESUME_REWRITE_TARGETS,
    modes: ALL_REWRITE_MODES,
    resolve: resolveResumeRewrite,
    inferTarget: inferResumeTarget,
  },
  supportedPersonaIds: ["recruiter", "engineering_manager", "founder", "hr"],
  frontend: {
    displayName: "Resume",
    iconKey: "resume",
    shortLabel: "resume",
    upload: {
      kind: "pdf",
      accept: "application/pdf",
      hint: "Upload a text-based PDF",
    },
    chooserHref: "/resume",
    preparingMessage: "Preparing your resume…",
    failedMessage: "Analysis could not complete. Try again with a text-based PDF.",
  },
  report: reportDefinition([{ id: "skills", label: "Skills" }]),
  promptVersions() {
    return {
      structureSpecId: this.specs.structure.specId,
      structureSpecVersion: this.specs.structure.version,
      aggregateSpecId: this.specs.aggregate.specId,
      aggregateSpecVersion: this.specs.aggregate.version,
      rewriteSpecId: this.specs.rewrite.specId,
      rewriteSpecVersion: this.specs.rewrite.version,
    };
  },
  extractStructured(version: ContentVersion) {
    return version.structuredResume;
  },
  pickStructured(input) {
    if (input.contentType !== "resume") {
      throw new Error("expected resume structured payload");
    }
    return input.structuredResume;
  },
  toContentVersionResponse(version: ContentVersion) {
    return {
      contentVersionId: version.id,
      contentId: version.contentId,
      contentType: "resume",
      schemaVersion: version.schemaVersion,
      structureSpecId: version.structureSpecId,
      structureSpecVersion: version.structureSpecVersion,
      structuredResume: version.structuredResume,
    };
  },
  async runStructure({ ai, version }): Promise<StructureRunOutput> {
    if (!version.normalizedText) throw new Error("Normalized version missing text");
    const result = await (ai as AiPlatform).invoke("structureDocument", {
      normalizedText: version.normalizedText,
    });
    const structured = result.data?.structuredResume;
    return {
      result,
      schemaVersion: structured?.schemaVersion ?? "1.0",
      structured,
      versionFields: structured ? { structuredResume: structured } : {},
    };
  },
  analyzePersonaInput(analysisRunId, persona, structured) {
    return {
      analysisRunId,
      persona,
      contentType: "resume",
      structuredResume: structured as StructuredResume,
    };
  },
  aggregateInput(input) {
    return {
      analysisRunId: input.analysisRunId,
      contentVersionId: input.contentVersionId,
      contentType: "resume",
      structuredResume: input.structured as StructuredResume,
      personaAnalyses: input.personaAnalyses,
      availability: input.availability,
    };
  },
  validatePersona(draft, structured) {
    return validatePersonaAnalysis(draft, structured as StructuredResume);
  },
  validateAggregate(draft, structured, personaAnalyses) {
    return validateAggregateReportEvidence(
      draft,
      structured as StructuredResume,
      personaAnalyses,
    );
  },
};
