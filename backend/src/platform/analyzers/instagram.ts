import type { AiPlatform } from "../ai/AiPlatform.js";
import { reportDefinition } from "../../domain/analysis/report-definition.js";
import { parseInstagramNormalized } from "../../domain/instagram/normalized-instagram.js";
import type { StructuredInstagramPost } from "../../domain/instagram/structured-instagram-post.js";
import type { ContentVersion } from "../../domain/resume/content.js";
import {
  validateAggregateReportEvidenceInstagram,
  validatePersonaAnalysisInstagram,
} from "../ai/validation/validateOutput.js";
import {
  ALL_REWRITE_MODES,
  INSTAGRAM_REWRITE_TARGETS,
} from "../../domain/rewrite/rewrite-config.js";
import { inferInstagramTarget, resolveInstagramRewrite } from "./rewrite-resolve.js";
import type { ContentAnalyzerModule, StructureRunOutput } from "./types.js";

export const instagramAnalyzer: ContentAnalyzerModule = {
  contentType: "instagram_post",
  structureCapabilityId: "structureInstagramPost",
  specs: {
    structure: {
      specId: "structure/instagram",
      version: 1,
      file: "structure/instagram.v1.md",
    },
    aggregate: {
      specId: "aggregate/instagram",
      version: 1,
      file: "aggregate.instagram.system.md",
    },
    rewrite: {
      specId: "rewrite/instagram",
      version: 1,
      file: "rewrite/instagram.v1.md",
    },
    personaFileSuffix: ".instagram",
    structuredJsonTag: "structured_instagram_post_json",
  },
  rewrite: {
    enabled: true,
    targets: INSTAGRAM_REWRITE_TARGETS,
    modes: ALL_REWRITE_MODES,
    resolve: resolveInstagramRewrite,
    inferTarget: inferInstagramTarget,
  },
  supportedPersonaIds: [
    "new_viewer",
    "existing_follower",
    "brand_strategist",
    "content_creator",
  ],
  frontend: {
    displayName: "Instagram post",
    iconKey: "instagram",
    shortLabel: "Instagram post",
    upload: {
      kind: "image_json",
      accept: "image/jpeg,image/png,image/webp,image/gif",
      hint: "One or more images, caption, and optional hashtags",
    },
    preparingMessage: "Preparing your Instagram post…",
    failedMessage: "Instagram analysis could not complete. Check the image and caption and try again.",
  },
  report: reportDefinition([{ id: "visualReview", label: "Visual Review" }]),
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
    return version.structuredInstagramPost;
  },
  pickStructured(input) {
    if (input.contentType !== "instagram_post") {
      throw new Error("expected Instagram structured payload");
    }
    return input.structuredInstagramPost;
  },
  toContentVersionResponse(version: ContentVersion) {
    return {
      contentVersionId: version.id,
      contentId: version.contentId,
      contentType: "instagram_post",
      schemaVersion: version.schemaVersion,
      structureSpecId: version.structureSpecId,
      structureSpecVersion: version.structureSpecVersion,
      structuredInstagramPost: version.structuredInstagramPost,
    };
  },
  async runStructure({ ai, storage, version }): Promise<StructureRunOutput> {
    if (!version.normalizedText) throw new Error("Normalized version missing text");
    const files =
      version.sourceFiles?.length
        ? version.sourceFiles
        : version.sourceFile
          ? [version.sourceFile]
          : [];
    if (!files.length) throw new Error("Instagram image missing");
    const images = [];
    for (const file of files) {
      const buffer = await storage.getObject(file.storageKey);
      images.push({
        mimeType: file.mimeType,
        base64: buffer.toString("base64"),
      });
    }
    const payload = parseInstagramNormalized(version.normalizedText);
    const result = await (ai as AiPlatform).invoke("structureInstagramPost", {
      image: images[0]!,
      images,
      caption: payload.caption,
      hashtags: payload.hashtags,
    });
    const structured = result.data?.structuredInstagramPost;
    return {
      result,
      schemaVersion: structured?.schemaVersion ?? "1.0",
      structured,
      versionFields: structured ? { structuredInstagramPost: structured } : {},
    };
  },
  analyzePersonaInput(analysisRunId, persona, structured) {
    return {
      analysisRunId,
      persona,
      contentType: "instagram_post",
      structuredInstagramPost: structured as StructuredInstagramPost,
    };
  },
  aggregateInput(input) {
    return {
      analysisRunId: input.analysisRunId,
      contentVersionId: input.contentVersionId,
      contentType: "instagram_post",
      structuredInstagramPost: input.structured as StructuredInstagramPost,
      personaAnalyses: input.personaAnalyses,
      availability: input.availability,
    };
  },
  validatePersona(draft, structured) {
    return validatePersonaAnalysisInstagram(draft, structured as StructuredInstagramPost);
  },
  validateAggregate(draft, structured, personaAnalyses) {
    return validateAggregateReportEvidenceInstagram(
      draft,
      structured as StructuredInstagramPost,
      personaAnalyses,
    );
  },
};
