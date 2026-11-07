import type { AiPlatform } from "../ai/AiPlatform.js";
import { reportDefinition } from "../../domain/analysis/report-definition.js";
import type { StructuredLinkedInProfile } from "../../domain/linkedin/structured-linkedin-profile.js";
import type { ContentVersion } from "../../domain/resume/content.js";
import {
  validateAggregateReportEvidenceLinkedIn,
  validatePersonaAnalysisLinkedIn,
} from "../ai/validation/validateOutput.js";
import {
  ALL_REWRITE_MODES,
  LINKEDIN_REWRITE_TARGETS,
} from "../../domain/rewrite/rewrite-config.js";
import { inferLinkedInTarget, resolveLinkedInRewrite } from "./rewrite-resolve.js";
import type { ContentAnalyzerModule, StructureRunOutput } from "./types.js";

export const linkedInAnalyzer: ContentAnalyzerModule = {
  contentType: "linkedin_profile",
  structureCapabilityId: "structureLinkedInProfile",
  specs: {
    structure: {
      specId: "structure/linkedin",
      version: 1,
      file: "structure/linkedin.v1.md",
    },
    aggregate: {
      specId: "aggregate/linkedin",
      version: 1,
      file: "aggregate.linkedin.system.md",
    },
    rewrite: {
      specId: "rewrite/linkedin",
      version: 1,
      file: "rewrite/linkedin.v1.md",
    },
    personaFileSuffix: ".linkedin",
    structuredJsonTag: "structured_linkedin_profile_json",
  },
  rewrite: {
    enabled: true,
    targets: LINKEDIN_REWRITE_TARGETS,
    modes: ALL_REWRITE_MODES,
    resolve: resolveLinkedInRewrite,
    inferTarget: inferLinkedInTarget,
  },
  supportedPersonaIds: ["recruiter", "engineering_manager", "founder", "hr"],
  frontend: {
    displayName: "LinkedIn profile",
    iconKey: "linkedin",
    shortLabel: "LinkedIn profile",
    upload: {
      kind: "paste",
      hint: "Paste profile text",
    },
    chooserHref: "/linkedin",
    preparingMessage: "Preparing your LinkedIn profile…",
    failedMessage:
      "LinkedIn analysis could not complete. Check your pasted text and try again.",
  },
  report: reportDefinition([{ id: "experience", label: "Experience" }]),
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
    return version.structuredLinkedInProfile;
  },
  pickStructured(input) {
    if (input.contentType !== "linkedin_profile") {
      throw new Error("expected LinkedIn structured payload");
    }
    return input.structuredLinkedInProfile;
  },
  toContentVersionResponse(version: ContentVersion) {
    return {
      contentVersionId: version.id,
      contentId: version.contentId,
      contentType: "linkedin_profile",
      schemaVersion: version.schemaVersion,
      structureSpecId: version.structureSpecId,
      structureSpecVersion: version.structureSpecVersion,
      structuredLinkedInProfile: version.structuredLinkedInProfile,
    };
  },
  async runStructure({ ai, version }): Promise<StructureRunOutput> {
    if (!version.normalizedText) throw new Error("Normalized version missing text");
    const result = await (ai as AiPlatform).invoke("structureLinkedInProfile", {
      normalizedText: version.normalizedText,
    });
    const structured = result.data?.structuredLinkedInProfile;
    return {
      result,
      schemaVersion: structured?.schemaVersion ?? "1.0",
      structured,
      versionFields: structured ? { structuredLinkedInProfile: structured } : {},
    };
  },
  analyzePersonaInput(analysisRunId, persona, structured) {
    return {
      analysisRunId,
      persona,
      contentType: "linkedin_profile",
      structuredLinkedInProfile: structured as StructuredLinkedInProfile,
    };
  },
  aggregateInput(input) {
    return {
      analysisRunId: input.analysisRunId,
      contentVersionId: input.contentVersionId,
      contentType: "linkedin_profile",
      structuredLinkedInProfile: input.structured as StructuredLinkedInProfile,
      personaAnalyses: input.personaAnalyses,
      availability: input.availability,
    };
  },
  validatePersona(draft, structured) {
    return validatePersonaAnalysisLinkedIn(draft, structured as StructuredLinkedInProfile);
  },
  validateAggregate(draft, structured, personaAnalyses) {
    return validateAggregateReportEvidenceLinkedIn(
      draft,
      structured as StructuredLinkedInProfile,
      personaAnalyses,
    );
  },
};
