import { createHash } from "crypto";
import type { Queue } from "bullmq";
import type { ContentRepository } from "../../infrastructure/db/repositories/content.repository.js";
import type { AnalysisRepository } from "../../infrastructure/db/repositories/analysis.repository.js";
import type { PersonaRepository } from "../../infrastructure/db/repositories/persona.repository.js";
import type { ObjectStorage } from "../../infrastructure/storage/storage.port.js";
import { parseInstagramImages } from "./instagram-image.js";
import { serializeInstagramNormalized } from "../../domain/instagram/normalized-instagram.js";
import { contentAnalyzerRegistry } from "../../platform/analyzers/registry.js";

export class ImpressionService {
  constructor(
    private readonly contents: ContentRepository,
    private readonly analyses: AnalysisRepository,
    private readonly personas: PersonaRepository,
    private readonly storage: ObjectStorage,
    private readonly ingestQueue: Queue,
  ) {}

  async startFromPdf(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<{ analysisId: string; contentId: string }> {
    const content = await this.contents.createContent(userId, "resume");
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const storageKey = `users/${userId}/contents/${content.id}/original.pdf`;
    await this.storage.putObject(storageKey, file.buffer, file.mimetype);

    const analyzer = contentAnalyzerRegistry.get("resume");
    const enabled = await this.personas.listEnabled(analyzer.contentType);
    const analysis = await this.analyses.create({
      userId,
      contentId: content.id,
      contentType: analyzer.contentType,
      promptVersions: analyzer.promptVersions(),
      status: "queued",
      personaSteps: enabled.map((p) => ({
        personaId: p.id,
        status: "pending",
        attempts: 0,
      })),
    });

    await this.ingestQueue.add(
      "extract",
      {
        analysisId: analysis.id,
        contentId: content.id,
        userId,
        storageKey,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        checksumSha256: checksum,
      },
      { jobId: `extract-${analysis.id}` },
    );

    return { analysisId: analysis.id, contentId: content.id };
  }

  async startFromLinkedInPaste(
    userId: string,
    profileText: string,
  ): Promise<{ analysisId: string; contentId: string }> {
    const normalizedText = profileText.trim();
    if (normalizedText.length < 50) {
      throw new Error("VALIDATION: profile text too short (minimum 50 characters)");
    }

    const content = await this.contents.createContent(userId, "linkedin_profile");
    const checksum = createHash("sha256").update(normalizedText, "utf8").digest("hex");
    const analyzer = contentAnalyzerRegistry.get("linkedin_profile");
    const enabled = await this.personas.listEnabled(analyzer.contentType);
    const analysis = await this.analyses.create({
      userId,
      contentId: content.id,
      contentType: analyzer.contentType,
      promptVersions: analyzer.promptVersions(),
      status: "queued",
      personaSteps: enabled.map((p) => ({
        personaId: p.id,
        status: "pending",
        attempts: 0,
      })),
    });

    await this.ingestQueue.add(
      "linkedin",
      {
        analysisId: analysis.id,
        contentId: content.id,
        userId,
        profileText: normalizedText,
        checksumSha256: checksum,
      },
      { jobId: `linkedin-${analysis.id}` },
    );

    return { analysisId: analysis.id, contentId: content.id };
  }

  async startFromInstagram(
    userId: string,
    input: { image?: unknown; images?: unknown; caption?: unknown; hashtags?: unknown },
  ): Promise<{ analysisId: string; contentId: string }> {
    const parsed = parseInstagramImages(input);
    const caption = typeof input.caption === "string" ? input.caption : "";
    if (caption.length > 5000) {
      throw new Error("VALIDATION: caption too long (maximum 5000 characters)");
    }
    const hashtags = Array.isArray(input.hashtags)
      ? input.hashtags.filter((h): h is string => typeof h === "string").slice(0, 30)
      : [];

    const content = await this.contents.createContent(userId, "instagram_post");
    const hash = createHash("sha256");
    for (const img of parsed) {
      hash.update(img.buffer);
      hash.update("\n");
    }
    const checksum = hash
      .update(caption, "utf8")
      .update("\n")
      .update(hashtags.join(","), "utf8")
      .digest("hex");

    const stored = [];
    for (let i = 0; i < parsed.length; i++) {
      const img = parsed[i]!;
      const storageKey = `users/${userId}/contents/${content.id}/instagram-${i}${img.extension}`;
      await this.storage.putObject(storageKey, img.buffer, img.mimeType);
      stored.push({
        storageKey,
        originalFilename: parsed.length === 1 ? `instagram-post${img.extension}` : `instagram-post-${i + 1}${img.extension}`,
        mimeType: img.mimeType,
        sizeBytes: img.buffer.length,
        checksumSha256: createHash("sha256").update(img.buffer).digest("hex"),
      });
    }
    const primary = stored[0]!;

    const analyzer = contentAnalyzerRegistry.get("instagram_post");
    const enabled = await this.personas.listEnabled(analyzer.contentType);
    const analysis = await this.analyses.create({
      userId,
      contentId: content.id,
      contentType: analyzer.contentType,
      promptVersions: analyzer.promptVersions(),
      status: "queued",
      personaSteps: enabled.map((p) => ({
        personaId: p.id,
        status: "pending",
        attempts: 0,
      })),
    });

    await this.ingestQueue.add(
      "instagram",
      {
        analysisId: analysis.id,
        contentId: content.id,
        userId,
        storageKey: primary.storageKey,
        originalFilename: primary.originalFilename,
        mimeType: primary.mimeType,
        sizeBytes: primary.sizeBytes,
        checksumSha256: checksum,
        caption,
        hashtags,
        normalizedText: serializeInstagramNormalized({ caption, hashtags }),
        images: stored,
      },
      { jobId: `instagram-${analysis.id}` },
    );

    return { analysisId: analysis.id, contentId: content.id };
  }
}
