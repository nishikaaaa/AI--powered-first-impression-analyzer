import OpenAI from "openai";
import type { Logger } from "../ports/Logger.js";
import { OPENAI_SCHEMA_NAMES } from "../validation/openai-schemas.js";

export type QualityTier = "standard" | "premium";

export type GatewayPurpose = "extraction" | "reasoning" | "synthesis";

export type LlmTextPart = { type: "text"; text: string };
export type LlmImageUrlPart = {
  type: "image_url";
  image_url: { url: string };
};
export type LlmMessageContent = string | Array<LlmTextPart | LlmImageUrlPart>;
export type LlmChatMessage = {
  role: "system" | "user";
  content: LlmMessageContent;
};

export type StructuredCompletionRequest = {
  purpose: GatewayPurpose;
  qualityTier: QualityTier;
  messages: LlmChatMessage[];
  jsonSchema: Record<string, unknown>;
  schemaName: string;
};

export type StructuredCompletionResponse = {
  parsed: unknown;
  usageUnits: number;
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
};

export interface LlmGateway {
  completeStructured(req: StructuredCompletionRequest): Promise<StructuredCompletionResponse>;
}

export class OpenAiLlmGateway implements LlmGateway {
  private client: OpenAI;

  constructor(
    apiKey: string,
    private readonly models: {
      extractionStandard: string;
      reasoningStandard: string;
      reasoningPremium: string;
      synthesisPremium: string;
    },
    private readonly log: Logger,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  private resolveModel(purpose: GatewayPurpose, tier: QualityTier): string {
    if (purpose === "extraction") return this.models.extractionStandard;
    if (purpose === "synthesis") return this.models.synthesisPremium;
    return tier === "premium" ? this.models.reasoningPremium : this.models.reasoningStandard;
  }

  async completeStructured(req: StructuredCompletionRequest): Promise<StructuredCompletionResponse> {
    const model = this.resolveModel(req.purpose, req.qualityTier);
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({
        model,
        messages: req.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: req.schemaName,
            strict: true,
            schema: req.jsonSchema,
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("json_schema") || message.includes("Invalid schema")) {
        this.log.error("openai rejected json schema", {
          schemaName: req.schemaName,
          message,
        });
        throw new Error(`PROVIDER_SCHEMA_REJECTED: ${message}`);
      }
      if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
        throw new Error(`PROVIDER_RATE_LIMITED: ${message}`);
      }
      throw new Error(`PROVIDER_UNAVAILABLE: ${message}`);
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("PROVIDER_EMPTY: no completion content");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("PROVIDER_INVALID_JSON");
    }

    const usage = response.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const usageUnits = promptTokens + completionTokens;

    this.log.info("llm completion", {
      purpose: req.purpose,
      qualityTier: req.qualityTier,
      schemaName: req.schemaName,
      usageUnits,
    });

    return {
      parsed,
      usageUnits,
      provider: "openai",
      model,
      promptTokens,
      completionTokens,
    };
  }
}

const STUB_IDENTITY = {
  name: "Sample User",
  headline: "Engineer",
  email: "",
  phone: "",
  location: "",
};

const STUB_EVIDENCE = {
  sectionId: "exp_0",
  bulletId: "b1",
  fieldPath: "",
  excerpt: "Built APIs serving 1M requests/day.",
};

const STUB_INSTAGRAM_EVIDENCE = {
  sectionId: "media_0_region_0",
  bulletId: "",
  fieldPath: "",
  excerpt: "White ceramic mug occupies the center of the frame.",
};

function userMessageText(messages: LlmChatMessage[]): string {
  const parts: string[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") parts.push(m.content);
    else {
      for (const p of m.content) {
        if (p.type === "text") parts.push(p.text);
      }
    }
  }
  return parts.join("\n");
}

function stubEvidenceFor(messages: LlmChatMessage[]) {
  const text = userMessageText(messages);
  if (
    text.includes("structured_instagram_post_json") ||
    /media_\d+_region_\d+/.test(text)
  ) {
    const match = text.match(/media_\d+_region_\d+/);
    return {
      ...STUB_INSTAGRAM_EVIDENCE,
      sectionId: match?.[0] ?? STUB_INSTAGRAM_EVIDENCE.sectionId,
    };
  }
  return STUB_EVIDENCE;
}

function stubCompletion(
  parsed: unknown,
  usageUnits: number,
): StructuredCompletionResponse {
  return { parsed, usageUnits, provider: "stub", model: "stub" };
}

export class StubLlmGateway implements LlmGateway {
  async completeStructured(req: StructuredCompletionRequest): Promise<StructuredCompletionResponse> {
    if (req.schemaName === OPENAI_SCHEMA_NAMES.structuredResume) {
      return stubCompletion({
          schemaVersion: "1.0",
          identity: STUB_IDENTITY,
          sections: [
            {
              sectionId: "summary_main",
              type: "summary",
              title: "",
              bullets: [
                {
                  bulletId: "b1",
                  text: "Experienced software engineer with backend focus.",
                },
              ],
            },
            {
              sectionId: "exp_0",
              type: "experience",
              title: "Acme Corp — Software Engineer",
              bullets: [
                { bulletId: "b1", text: "Built APIs serving 1M requests/day." },
                { bulletId: "b2", text: "Led migration to event-driven architecture." },
              ],
            },
          ],
        },
        100,
      );
    }

    if (req.schemaName === OPENAI_SCHEMA_NAMES.structuredLinkedIn) {
      return stubCompletion({
          schemaVersion: "1.0",
          identity: {
            name: "Alex Chen",
            headline: "Senior Software Engineer | Backend",
            location: "San Francisco, CA",
            industry: "Technology",
            connectionCount: "",
            profileUrl: "",
          },
          about: {
            sectionId: "about_main",
            title: "",
            body: "Backend engineer focused on distributed systems and developer experience.",
            bullets: [],
          },
          experience: [
            {
              sectionId: "exp_0",
              title: "Senior Software Engineer",
              company: "Example Co",
              dateRange: "2021 – Present",
              location: "",
              descriptionBullets: [
                { bulletId: "b1", text: "Led API platform serving 2M daily users." },
              ],
            },
          ],
          education: [],
          skills: [{ skillId: "skill_0", name: "TypeScript" }],
          certifications: [],
          projects: [],
          featured: [],
          recommendations: [],
          licenses: [],
          volunteer: [],
          publications: [],
          honors: [],
          languages: [],
        },
        120,
      );
    }

    if (req.schemaName === OPENAI_SCHEMA_NAMES.structuredInstagram) {
      return stubCompletion({
          schemaVersion: "1.0",
          mediaItems: [
            {
              mediaType: "image",
              mimeType: "image/png",
              orientation: "square",
              aspectHint: "1:1",
              visualStyle: "product photograph",
              regions: [
                {
                  kind: "product",
                  label: "Ceramic mug",
                  description: "White ceramic mug occupies the center of the frame.",
                  vertical: "center",
                  horizontal: "center",
                },
              ],
            },
          ],
          composition: {
            layout: "centered subject",
            lighting: "daylight",
            colorPalette: ["#f5f0e8", "#ffffff", "#c47b4a"],
            focalPointRegionIndex: "0",
          },
          branding: {
            brandName: "",
            logoVisible: "no",
            brandCues: "",
            logoRegionIndex: "",
          },
          detectedText: [],
          hashtags: [{ tag: "slowmorning" }],
        },
        130,
      );
    }

    if (req.schemaName === OPENAI_SCHEMA_NAMES.contentRewrite) {
      const text = userMessageText(req.messages);
      const originalMatch = text.match(
        /<original_content>\n?([\s\S]*?)\n?<\/original_content>/,
      );
      const original = originalMatch?.[1]?.trim() || "Original content";
      const missing: string[] = [];
      if (!/\d/.test(original)) {
        missing.push("quantified results if the author has them");
      }
      return stubCompletion(
        {
          rewrittenText: original,
          explanation:
            "Clarified wording while keeping the same facts and intent.",
          warnings: [],
          missingInformation: missing,
        },
        80,
      );
    }

    const evidence = stubEvidenceFor(req.messages);
    const instagram = evidence.sectionId.startsWith("media_");

    if (req.schemaName === OPENAI_SCHEMA_NAMES.personaAnalysis) {
      return stubCompletion({
          firstImpression: instagram
            ? "The post leads with a clearly framed product image and a short caption."
            : "Comes across as a capable backend engineer with ownership signals.",
          firstImpressionEvidence: [evidence],
          snapshotSeconds: instagram
            ? "Looked at the primary image region and caption."
            : "Skimmed summary and most recent experience bullets.",
          lensSummary: instagram
            ? "Focused on what is immediately visible in the post."
            : "Focused on screening fit and clarity of impact.",
          claims: [
            {
              claimId: "c1",
              kind: "strength",
              statement: instagram
                ? "Primary visual is a clearly framed product."
                : "Recent role shows measurable scale.",
              evidence: [evidence],
              confidence: {
                aiConfidence: "high",
                aiConfidenceReason: instagram
                  ? "Region describes a centered product."
                  : "Bullet states concrete scale.",
                evidenceStrength: "strong",
                informationCompleteness: "partial",
                missingInformation: instagram ? ["Brand name"] : ["Team size"],
              },
            },
          ],
        },
        200,
      );
    }

    return stubCompletion({
        executiveSummary: instagram
          ? "The post presents a simple product-centered image with a short caption."
          : "Overall strong backend profile with clear ownership in recent role.",
        overallFirstImpression: instagram
          ? "Immediately readable product photo; caption is brief."
          : "Professional, credible, slightly light on leadership narrative.",
        consensusThemes: instagram
          ? ["Clear product visual", "Short caption"]
          : ["Backend strength", "Ownership"],
        conflictingPerspectives: [],
        personaHeadlineEntries: instagram
          ? [{ personaId: "new_viewer", headline: "Clear product-first post" }]
          : [{ personaId: "recruiter", headline: "Strong backend screen candidate" }],
        synthesisClaims: [
          {
            claimId: "s1",
            statement: instagram
              ? "The image region makes the product the first thing a viewer sees."
              : "Backend credibility reads clearly in the first scan.",
            sourceClaimIds: ["c1"],
            sourcePersonaIds: instagram ? ["new_viewer"] : ["recruiter"],
            evidence: [evidence],
          },
        ],
      },
      150,
    );
  }
}
