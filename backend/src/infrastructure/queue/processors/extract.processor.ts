import type { Job } from "bullmq";
import type { Container } from "../../../composition/create-container.js";
import { extractTextFromPdf } from "../../parsing/pdf-extractor.js";
import type { ExtractJob, InstagramIngestJob, LinkedInIngestJob } from "../job-names.js";

export function createIngestProcessor(container: Container) {
  const { storage, contents, analyses, capabilityQueue, logger } = container;

  return async (job: Job<ExtractJob | LinkedInIngestJob | InstagramIngestJob>) => {
    if (job.name === "extract") {
      const data = job.data as ExtractJob;
      const started = Date.now();
      logger.info("ingest job start", { job: "extract", analysisId: data.analysisId });

      await analyses.update(data.analysisId, { status: "ingesting" });

      const existing = await contents.findNormalizedByChecksum(
        data.contentId,
        data.checksumSha256,
      );
      let normalizedVersionId: string;
      if (existing) {
        normalizedVersionId = existing.id;
        logger.info("extract reused normalized version", {
          analysisId: data.analysisId,
          contentVersionId: normalizedVersionId,
        });
      } else {
        const pdf = await storage.getObject(data.storageKey);
        const normalizedText = await extractTextFromPdf(pdf);
        const normalizedVersion = await contents.insertVersion({
          contentId: data.contentId,
          kind: "normalized",
          normalizedText,
          sourceFile: {
            storageKey: data.storageKey,
            originalFilename: data.originalFilename,
            mimeType: data.mimeType,
            sizeBytes: data.sizeBytes,
            checksumSha256: data.checksumSha256,
          },
        });
        normalizedVersionId = normalizedVersion.id;
      }

      await capabilityQueue.add(
        "structure",
        {
          analysisId: data.analysisId,
          contentId: data.contentId,
          normalizedVersionId,
        },
        { jobId: `structure-${data.analysisId}` },
      );

      logger.info("ingest job done", {
        job: "extract",
        analysisId: data.analysisId,
        contentVersionId: normalizedVersionId,
        durationMs: Date.now() - started,
        status: "success",
      });
      return;
    }

    if (job.name === "linkedin") {
      const data = job.data as LinkedInIngestJob;
      const started = Date.now();
      logger.info("ingest job start", { job: "linkedin", analysisId: data.analysisId });

      await analyses.update(data.analysisId, { status: "ingesting" });

      const existing = await contents.findNormalizedByPasteChecksum(
        data.contentId,
        data.checksumSha256,
      );
      let normalizedVersionId: string;
      if (existing) {
        normalizedVersionId = existing.id;
        logger.info("linkedin ingest reused normalized version", {
          analysisId: data.analysisId,
          contentVersionId: normalizedVersionId,
        });
      } else {
        const normalizedVersion = await contents.insertVersion({
          contentId: data.contentId,
          kind: "normalized",
          normalizedText: data.profileText,
          sourcePaste: {
            checksumSha256: data.checksumSha256,
            charCount: data.profileText.length,
          },
        });
        normalizedVersionId = normalizedVersion.id;
      }

      await capabilityQueue.add(
        "structure",
        {
          analysisId: data.analysisId,
          contentId: data.contentId,
          normalizedVersionId,
        },
        { jobId: `structure-${data.analysisId}` },
      );

      logger.info("ingest job done", {
        job: "linkedin",
        analysisId: data.analysisId,
        contentVersionId: normalizedVersionId,
        durationMs: Date.now() - started,
        status: "success",
      });
      return;
    }

    if (job.name === "instagram") {
      const data = job.data as InstagramIngestJob;
      const started = Date.now();
      logger.info("ingest job start", { job: "instagram", analysisId: data.analysisId });

      await analyses.update(data.analysisId, { status: "ingesting" });

      const existing = await contents.findNormalizedByChecksum(
        data.contentId,
        data.checksumSha256,
      );
      let normalizedVersionId: string;
      if (existing) {
        normalizedVersionId = existing.id;
        logger.info("instagram ingest reused normalized version", {
          analysisId: data.analysisId,
          contentVersionId: normalizedVersionId,
        });
      } else {
        const images = data.images?.length
          ? data.images
          : [
              {
                storageKey: data.storageKey,
                originalFilename: data.originalFilename,
                mimeType: data.mimeType,
                sizeBytes: data.sizeBytes,
                checksumSha256: data.checksumSha256,
              },
            ];
        const normalizedVersion = await contents.insertVersion({
          contentId: data.contentId,
          kind: "normalized",
          normalizedText: data.normalizedText,
          sourceFile: images[0],
          sourceFiles: images,
        });
        normalizedVersionId = normalizedVersion.id;
      }

      await capabilityQueue.add(
        "structure",
        {
          analysisId: data.analysisId,
          contentId: data.contentId,
          normalizedVersionId,
        },
        { jobId: `structure-${data.analysisId}` },
      );

      logger.info("ingest job done", {
        job: "instagram",
        analysisId: data.analysisId,
        contentVersionId: normalizedVersionId,
        durationMs: Date.now() - started,
        status: "success",
      });
      return;
    }

    throw new Error(`Unknown ingest job: ${job.name}`);
  };
}

/** @deprecated use createIngestProcessor — kept for worker import name. */
export const createExtractProcessor = createIngestProcessor;
