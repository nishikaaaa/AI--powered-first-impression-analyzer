import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { ContentType } from "../../../domain/content/content-type.js";
import type { StructuredInstagramPost } from "../../../domain/instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../../../domain/linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "../../../domain/resume/structured-resume.js";
import { contentAnalyzerRegistry } from "../../analyzers/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = path.join(__dirname, "specs");

export class ContextBuilder {
  async buildStructureMessages(normalizedText: string): Promise<
    { role: "system" | "user"; content: string }[]
  > {
    const specFile = contentAnalyzerRegistry.get("resume").specs.structure.file;
    const system = await readFile(path.join(SPECS_DIR, specFile), "utf8");
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: `<untrusted_resume_text>\n${normalizedText}\n</untrusted_resume_text>`,
      },
    ];
  }

  async buildLinkedInStructureMessages(normalizedText: string): Promise<
    { role: "system" | "user"; content: string }[]
  > {
    const specFile = contentAnalyzerRegistry.get("linkedin_profile").specs.structure.file;
    const system = await readFile(path.join(SPECS_DIR, specFile), "utf8");
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: `<untrusted_linkedin_profile_text>\n${normalizedText}\n</untrusted_linkedin_profile_text>`,
      },
    ];
  }

  async buildInstagramStructureMessages(
    images: { mimeType: string; base64: string }[],
    caption: string,
    hashtags?: string[],
  ): Promise<
    {
      role: "system" | "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    }[]
  > {
    const specFile = contentAnalyzerRegistry.get("instagram_post").specs.structure.file;
    const system = await readFile(path.join(SPECS_DIR, specFile), "utf8");
    const hashtagText = (hashtags ?? []).join(" ");
    const slides = images.length ? images : [];
    const mimeList = slides.map((img, i) => `${i}:${img.mimeType}`).join(",");
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];
    slides.forEach((image, index) => {
      parts.push({
        type: "text",
        text: `<instagram_slide index="${index}" mime="${image.mimeType}">Slide ${index + 1} of ${slides.length}</instagram_slide>`,
      });
      parts.push({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
      });
    });
    parts.push({
      type: "text",
      text: `<untrusted_instagram_caption>\n${caption}\n</untrusted_instagram_caption>\n<untrusted_instagram_hashtags>\n${hashtagText}\n</untrusted_instagram_hashtags>\n<instagram_media_count>${slides.length}</instagram_media_count>\n<instagram_media_mime_type>${mimeList}</instagram_media_mime_type>`,
    });
    return [
      { role: "system", content: system },
      { role: "user", content: parts },
    ];
  }

  async buildPersonaMessages(
    specId: string,
    version: number,
    personaDisplayName: string,
    contentType: ContentType,
    structured: StructuredResume | StructuredLinkedInProfile | StructuredInstagramPost,
  ): Promise<{ role: "system" | "user"; content: string }[]> {
    const analyzer = contentAnalyzerRegistry.get(contentType);
    const file = path.join(
      SPECS_DIR,
      "personas",
      `${specId}${analyzer.specs.personaFileSuffix}.v${version}.md`,
    );
    let system = await readFile(file, "utf8");
    system = system.replace(/\{\{PERSONA_NAME\}\}/g, personaDisplayName);
    const tag = analyzer.specs.structuredJsonTag;
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: `<${tag}>\n${JSON.stringify(structured, null, 2)}\n</${tag}>`,
      },
    ];
  }

  async buildRewriteMessages(input: {
    contentType: ContentType;
    targetId: string;
    targetLabel: string;
    modeId: string;
    modeLabel: string;
    modeInstruction: string;
    originalText: string;
    structured: unknown;
    personaInsights?: unknown;
    aggregateRecommendations?: unknown;
  }): Promise<{ role: "system" | "user"; content: string }[]> {
    const analyzer = contentAnalyzerRegistry.get(input.contentType);
    const system = await readFile(
      path.join(SPECS_DIR, analyzer.specs.rewrite.file),
      "utf8",
    );
    const tag = analyzer.specs.structuredJsonTag;
    const optional: string[] = [];
    if (input.personaInsights) {
      optional.push(
        `<persona_insights>\n${JSON.stringify(input.personaInsights, null, 2)}\n</persona_insights>`,
      );
    }
    if (input.aggregateRecommendations) {
      optional.push(
        `<aggregate_recommendations>\n${JSON.stringify(input.aggregateRecommendations, null, 2)}\n</aggregate_recommendations>`,
      );
    }
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          `<rewrite_request>`,
          `content_type: ${input.contentType}`,
          `target: ${input.targetId} (${input.targetLabel})`,
          `mode: ${input.modeId} (${input.modeLabel})`,
          `mode_instruction: ${input.modeInstruction}`,
          `</rewrite_request>`,
          `<original_content>\n${input.originalText}\n</original_content>`,
          `<${tag}>\n${JSON.stringify(input.structured, null, 2)}\n</${tag}>`,
          ...optional,
        ].join("\n"),
      },
    ];
  }

  async buildAggregateMessages(
    payload: unknown,
    contentType: ContentType = "resume",
  ): Promise<{ role: "system" | "user"; content: string }[]> {
    const analyzer = contentAnalyzerRegistry.get(contentType);
    const system = await readFile(
      path.join(SPECS_DIR, analyzer.specs.aggregate.file),
      "utf8",
    );
    return [
      { role: "system", content: system },
      {
        role: "user",
        content: `<persona_analyses>\n${JSON.stringify(payload, null, 2)}\n</persona_analyses>`,
      },
    ];
  }
}
