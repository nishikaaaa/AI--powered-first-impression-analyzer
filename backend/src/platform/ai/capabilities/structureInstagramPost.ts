import {
  CAPTION_MAIN_SECTION_ID,
  captionLineSectionId,
  hashtagSectionId,
  imageRegionId,
  mediaItemId,
} from "../../../domain/instagram/instagram-ids.js";
import {
  extractHashtagsFromCaption,
  mergeHashtagTags,
} from "../../../domain/instagram/normalized-instagram.js";
import type {
  InstagramCaptionSection,
  StructuredInstagramPost,
} from "../../../domain/instagram/structured-instagram-post.js";
import { type CapabilityResult } from "../CapabilityResult.js";
import type { ContextBuilder } from "../context/ContextBuilder.js";
import { withAiExecution } from "../execution-metadata.js";
import type { LlmGateway } from "../gateway/LlmGateway.js";
import type { Clock } from "../ports/Clock.js";
import type { CostRecorder } from "../ports/CostRecorder.js";
import type { ExecutionRecorder } from "../ports/ExecutionRecorder.js";
import {
  OPENAI_SCHEMA_NAMES,
  structuredInstagramOpenAiSchema,
} from "../validation/openai-schemas.js";
import { normalizeStructuredInstagramFromLlm } from "../validation/openai-normalizers.js";
import { validateStructuredInstagram } from "../validation/validateOutput.js";

export type StructureInstagramImage = {
  mimeType: string;
  base64: string;
};

export type StructureInstagramPostInput = {
  image: StructureInstagramImage;
  images?: StructureInstagramImage[];
  caption: string;
  hashtags?: string[];
};

function inputImages(input: StructureInstagramPostInput): StructureInstagramImage[] {
  return input.images?.length ? input.images : [input.image];
}

export type StructureInstagramPostData = {
  structuredInstagramPost: StructuredInstagramPost;
};

function buildCaptionSections(caption: string): InstagramCaptionSection[] {
  const sections: InstagramCaptionSection[] = [
    { sectionId: CAPTION_MAIN_SECTION_ID, kind: "full", text: caption },
  ];
  const lines = caption.split(/\n/).map((line) => line.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    sections.push({
      sectionId: captionLineSectionId(i),
      kind: "line",
      text: line,
    });
  });
  return sections;
}

function applyKnownInputFields(
  normalized: unknown,
  input: StructureInstagramPostInput,
): unknown {
  if (!normalized || typeof normalized !== "object") return normalized;
  const o = { ...(normalized as Record<string, unknown>) };
  const images = inputImages(input);
  const items = Array.isArray(o.mediaItems) ? [...(o.mediaItems as unknown[])] : [];
  o.mediaItems = images.map((image, index) => {
    const existing =
      items[index] && typeof items[index] === "object"
        ? { ...(items[index] as Record<string, unknown>) }
        : {};
    const mimeType = image.mimeType.trim();
    const regions = Array.isArray(existing.regions) && existing.regions.length
      ? existing.regions
      : [
          {
            imageRegionId: imageRegionId(index, 0),
            kind: "scene",
            label: `Slide ${index + 1}`,
            description: "Full frame of this slide.",
            position: { vertical: "unknown", horizontal: "unknown" },
          },
        ];
    return {
      ...existing,
      mediaItemId: typeof existing.mediaItemId === "string" ? existing.mediaItemId : mediaItemId(index),
      mediaType: "image",
      ...(mimeType ? { mimeType } : {}),
      regions,
    };
  });

  const original = input.caption;
  const normalizedCaption = original.replace(/\s+/g, " ").trim();
  o.caption = {
    original,
    normalized: normalizedCaption,
    sections: buildCaptionSections(original),
  };

  const llmTags = Array.isArray(o.hashtags)
    ? (o.hashtags as { tag?: string }[]).map((h) => h.tag ?? "")
    : [];
  const tags = mergeHashtagTags(
    input.hashtags,
    extractHashtagsFromCaption(input.caption),
    llmTags,
  );
  o.hashtags = tags.map((tag, i) => ({
    hashtagId: hashtagSectionId(i),
    tag,
  }));
  return o;
}

export class StructureInstagramPostCapability {
  constructor(
    private readonly ctx: ContextBuilder,
    private readonly gateway: LlmGateway,
    private readonly clock: Clock,
    private readonly executions: ExecutionRecorder,
    private readonly costs: CostRecorder,
  ) {}

  async execute(
    input: StructureInstagramPostInput,
  ): Promise<CapabilityResult<StructureInstagramPostData>> {
    const start = this.clock.nowMs();
    const executionId = this.executions.start("structureInstagramPost");

    try {
      const messages = await this.ctx.buildInstagramStructureMessages(
        inputImages(input),
        input.caption,
        input.hashtags,
      );
      const gw = await this.gateway.completeStructured({
        purpose: "extraction",
        qualityTier: "standard",
        messages,
        jsonSchema: structuredInstagramOpenAiSchema as unknown as Record<string, unknown>,
        schemaName: OPENAI_SCHEMA_NAMES.structuredInstagram,
      });

      this.costs.record({
        executionId,
        capabilityId: "structureInstagramPost",
        units: gw.usageUnits,
      });

      const validation = validateStructuredInstagram(
        applyKnownInputFields(normalizeStructuredInstagramFromLlm(gw.parsed), input),
      );
      if (!validation.valid) {
        return withAiExecution(
          this.executions,
          executionId,
          "failed",
          {
            status: "failed",
            warnings: [],
            evidence: [],
            executionId,
            durationMs: this.clock.nowMs() - start,
            validation: {
              valid: false,
              errorCount: validation.errorCount,
              repairAttempted: false,
            },
            error: {
              code: "VALIDATION_FAILED",
              message: validation.errors.join("; "),
              retryable: true,
            },
          },
          gw,
        );
      }

      const structuredInstagramPost = validation.data as StructuredInstagramPost;
      return withAiExecution(
        this.executions,
        executionId,
        "success",
        {
          status: "success",
          data: { structuredInstagramPost },
          warnings: [],
          evidence: [],
          executionId,
          durationMs: this.clock.nowMs() - start,
          validation: {
            valid: true,
            errorCount: 0,
            repairAttempted: false,
          },
        },
        gw,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return withAiExecution(this.executions, executionId, "failed", {
        status: "failed",
        warnings: [],
        evidence: [],
        executionId,
        durationMs: this.clock.nowMs() - start,
        validation: { valid: false, errorCount: 1, repairAttempted: false },
        error: {
          code: message.startsWith("PROVIDER") ? message.split(":")[0]! : "INTERNAL",
          message,
          retryable: true,
        },
      });
    }
  }
}
