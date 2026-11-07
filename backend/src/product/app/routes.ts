import { Router, type Request, type Response } from "express";
import multer from "multer";
import type { Redis } from "ioredis";
import type { Container } from "../../composition/create-container.js";
import { env } from "../../config/env.js";
import { contentAnalyzerRegistry } from "../../platform/analyzers/registry.js";

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

function userId(req: Request): string {
  return (req.header("x-user-id") as string) || env.mvpUserId;
}

export function createRoutes(container: Container): Router {
  const router = Router();
  const { impressions, analyses, contents, rewrites } = container;

  router.get("/health", (_req, res) => res.json({ ok: true }));

  router.post("/v1/impressions", upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION", message: "file required" } });
      return;
    }
    if (req.file.mimetype !== "application/pdf") {
      res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA", message: "PDF only" } });
      return;
    }
    const out = await impressions.startFromPdf(userId(req), {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    res.status(202).json(out);
  });

  router.post("/v1/impressions/instagram", async (req, res) => {
    try {
      const out = await impressions.startFromInstagram(userId(req), {
        image: req.body?.image,
        images: req.body?.images,
        caption: req.body?.caption,
        hashtags: req.body?.hashtags,
      });
      res.status(202).json(out);
    } catch (e) {
      const message = e instanceof Error ? e.message : "validation failed";
      if (message.startsWith("VALIDATION:")) {
        res.status(400).json({
          error: { code: "VALIDATION", message: message.replace(/^VALIDATION:\s*/, "") },
        });
        return;
      }
      throw e;
    }
  });

  router.post("/v1/impressions/linkedin", async (req, res) => {
    const profileText =
      typeof req.body?.profileText === "string"
        ? req.body.profileText
        : typeof req.body?.text === "string"
          ? req.body.text
          : "";
    if (!profileText.trim()) {
      res.status(400).json({
        error: { code: "VALIDATION", message: "profileText required" },
      });
      return;
    }
    try {
      const out = await impressions.startFromLinkedInPaste(userId(req), profileText);
      res.status(202).json(out);
    } catch (e) {
      const message = e instanceof Error ? e.message : "validation failed";
      if (message.startsWith("VALIDATION:")) {
        res.status(400).json({
          error: { code: "VALIDATION", message: message.replace(/^VALIDATION:\s*/, "") },
        });
        return;
      }
      throw e;
    }
  });

  router.get("/v1/analyses/:id", async (req, res) => {
    const run = await analyses.get(req.params.id, userId(req));
    if (!run) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "analysis not found" } });
      return;
    }
    res.json(run);
  });

  router.get("/v1/analyses/:id/events", (req, res) => {
    void subscribeSse(req, res, container.redis, req.params.id);
  });

  router.get("/v1/reports/:id", async (req, res) => {
    const report = await analyses.getReport(req.params.id, userId(req));
    if (!report) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "report not found" } });
      return;
    }
    res.json({
      ...report,
      contentVersionId: report.contentVersionId,
    });
  });

  router.get("/v1/content-versions/:id", async (req, res) => {
    const version = await contents.getVersion(req.params.id, userId(req));
    if (!version) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "version not found" } });
      return;
    }
    if (version.kind !== "structured") {
      res.status(422).json({
        error: { code: "NOT_STRUCTURED", message: "version is not structured" },
      });
      return;
    }
    const analyzer = contentAnalyzerRegistry.findByStructuredVersion(version);
    if (!analyzer) {
      res.status(422).json({
        error: { code: "NOT_STRUCTURED", message: "structured payload missing" },
      });
      return;
    }
    res.json(analyzer.toContentVersionResponse(version));
  });

  router.get("/v1/analyses/:id/persona-results", async (req, res) => {
    const run = await analyses.get(req.params.id, userId(req));
    if (!run) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "analysis not found" } });
      return;
    }
    const results = await analyses.listPersonaResults(run.id);
    res.json(results);
  });

  router.get("/v1/personas", async (_req, res) => {
    const list = await container.personas.listEnabled("resume");
    res.json(list);
  });

  router.get("/v1/rewrite-catalog", (_req, res) => {
    res.json(rewrites.catalog());
  });

  router.post("/v1/rewrites", async (req, res) => {
    const analysisId =
      typeof req.body?.analysisId === "string" ? req.body.analysisId : "";
    const mode = typeof req.body?.mode === "string" ? req.body.mode : "";
    if (!analysisId || !mode) {
      res.status(400).json({
        error: { code: "VALIDATION", message: "analysisId and mode required" },
      });
      return;
    }
    try {
      const out = await rewrites.rewrite(userId(req), {
        analysisId,
        mode,
        targetId: typeof req.body?.targetId === "string" ? req.body.targetId : undefined,
        sectionId: typeof req.body?.sectionId === "string" ? req.body.sectionId : undefined,
        bulletId: typeof req.body?.bulletId === "string" ? req.body.bulletId : undefined,
        originalText:
          typeof req.body?.originalText === "string" ? req.body.originalText : undefined,
      });
      res.json(out);
    } catch (e) {
      const message = e instanceof Error ? e.message : "rewrite failed";
      if (message.startsWith("NOT_FOUND:")) {
        res.status(404).json({
          error: { code: "NOT_FOUND", message: message.replace(/^NOT_FOUND:\s*/, "") },
        });
        return;
      }
      if (message.startsWith("VALIDATION:")) {
        res.status(400).json({
          error: { code: "VALIDATION", message: message.replace(/^VALIDATION:\s*/, "") },
        });
        return;
      }
      res.status(422).json({
        error: { code: "REWRITE_FAILED", message },
      });
    }
  });

  return router;
}

async function subscribeSse(req: Request, res: Response, redis: Redis, analysisId: string) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const channel = `analysis:${analysisId}`;
  const sub = redis.duplicate();
  await sub.subscribe(channel);

  const send = (payload: string) => {
    res.write(`data: ${payload}\n\n`);
  };

  sub.on("message", (_ch: string, message: string) => {
    send(message);
  });

  req.on("close", () => {
    void sub.unsubscribe(channel);
    void sub.quit();
  });
}
