/**
 * End-to-end pipeline tests (StubLlmGateway, in-memory Mongo, local Redis).
 * Run: OPENAI_API_KEY= npm run test:integration
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Job } from "bullmq";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createContainer } from "../composition/create-container.js";
import type { Container } from "../composition/create-container.js";
import { connectMongo, disconnectMongo } from "../infrastructure/db/mongo-client.js";
import { createPinoLogger } from "../infrastructure/ports/impl/pino-logger.js";
import { createCapabilityProcessor } from "../infrastructure/queue/processors/capability.processor.js";
import { createIngestProcessor } from "../infrastructure/queue/processors/extract.processor.js";
import type {
  AggregateJob,
  InstagramIngestJob,
  LinkedInIngestJob,
  PersonaJob,
  StructureJob,
} from "../infrastructure/queue/job-names.js";
import { env } from "../config/env.js";

const USER = "integration-user";

const RESUME_TEXT =
  "Jane Doe\nSoftware Engineer\n\nSummary\nExperienced engineer building reliable systems at scale.\n\nExperience\nAcme — Engineer\n2020 – Present\n• Built APIs serving 1M requests/day.\n";

const LINKEDIN_TEXT =
  "Alex Chen\nSenior Software Engineer\nSan Francisco\n\nAbout\nBackend engineer focused on distributed systems and platform work.\n\nExperience\nExample Co\n2021 – Present\n• Led API platform serving 2M daily users.\n";

const PERSONAS = [
  {
    id: "recruiter",
    displayName: "Recruiter",
    contentTypes: ["resume", "linkedin_profile"],
    contextSpecId: "persona/recruiter",
    contextSpecVersion: 1,
    qualityTier: "standard" as const,
    enabled: true,
    sortOrder: 10,
    version: 1,
  },
  {
    id: "engineering_manager",
    displayName: "Engineering Manager",
    contentTypes: ["resume", "linkedin_profile"],
    contextSpecId: "persona/engineering_manager",
    contextSpecVersion: 1,
    qualityTier: "premium" as const,
    enabled: true,
    sortOrder: 20,
    version: 1,
  },
  {
    id: "founder",
    displayName: "Founder",
    contentTypes: ["resume", "linkedin_profile"],
    contextSpecId: "persona/founder",
    contextSpecVersion: 1,
    qualityTier: "premium" as const,
    enabled: true,
    sortOrder: 30,
    version: 1,
  },
  {
    id: "hr",
    displayName: "HR",
    contentTypes: ["resume", "linkedin_profile"],
    contextSpecId: "persona/hr",
    contextSpecVersion: 1,
    qualityTier: "standard" as const,
    enabled: true,
    sortOrder: 40,
    version: 1,
  },
];

const INSTAGRAM_PERSONAS = [
  {
    id: "new_viewer",
    displayName: "New Viewer",
    contentTypes: ["instagram_post"],
    contextSpecId: "persona/new_viewer",
    contextSpecVersion: 1,
    qualityTier: "standard" as const,
    enabled: true,
    sortOrder: 10,
    version: 1,
  },
  {
    id: "existing_follower",
    displayName: "Existing Follower",
    contentTypes: ["instagram_post"],
    contextSpecId: "persona/existing_follower",
    contextSpecVersion: 1,
    qualityTier: "standard" as const,
    enabled: true,
    sortOrder: 20,
    version: 1,
  },
  {
    id: "brand_strategist",
    displayName: "Brand Strategist",
    contentTypes: ["instagram_post"],
    contextSpecId: "persona/brand_strategist",
    contextSpecVersion: 1,
    qualityTier: "premium" as const,
    enabled: true,
    sortOrder: 30,
    version: 1,
  },
  {
    id: "content_creator",
    displayName: "Content Creator",
    contentTypes: ["instagram_post"],
    contextSpecId: "persona/content_creator",
    contextSpecVersion: 1,
    qualityTier: "premium" as const,
    enabled: true,
    sortOrder: 40,
    version: 1,
  },
];

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function fakeJob<T>(name: string, data: T): Job<T> {
  return {
    name,
    data,
    attemptsMade: 0,
    opts: { attempts: 2 },
  } as Job<T>;
}

async function seedPersonas(container: Container) {
  const col = container.db.collection("personas");
  for (const p of [...PERSONAS, ...INSTAGRAM_PERSONAS]) {
    await col.updateOne({ id: p.id }, { $set: p }, { upsert: true });
  }
}

/** Processors enqueue follow-up jobs and SSE; tests invoke handlers directly instead. */
function patchQueueSideEffects(container: Container) {
  container.capabilityQueue.add = (async () => ({ id: "test-job" })) as unknown as typeof container.capabilityQueue.add;
  container.ingestQueue.add = (async () => ({ id: "test-job" })) as unknown as typeof container.ingestQueue.add;
  container.notifications.publish = async () => {};
}

async function runStructurePersonasAggregate(
  container: Container,
  analysisId: string,
  contentId: string,
  normalizedVersionId: string,
) {
  const cap = createCapabilityProcessor(container);
  await cap(
    fakeJob<StructureJob>("structure", {
      analysisId,
      contentId,
      normalizedVersionId,
    }),
  );

  const run = await container.analyses.getById(analysisId);
  assert.ok(run?.contentVersionId, "structured contentVersionId expected");

  for (const step of run.personaSteps) {
    await cap(
      fakeJob<PersonaJob>("persona", {
        analysisId,
        contentVersionId: run.contentVersionId!,
        personaId: step.personaId,
      }),
    );
  }

  await cap(
    fakeJob<AggregateJob>("aggregate", {
      analysisId,
      contentVersionId: run.contentVersionId!,
    }),
  );

  return container.analyses.getById(analysisId);
}

async function testResumePipeline(container: Container) {
  const content = await container.contents.createContent(USER, "resume");
  const normalized = await container.contents.insertVersion({
    contentId: content.id,
    kind: "normalized",
    normalizedText: RESUME_TEXT,
  });
  const enabled = await container.personas.listEnabled("resume");
  assert.ok(enabled.length >= env.minPersonasForAggregate);

  const analysis = await container.analyses.create({
    userId: USER,
    contentId: content.id,
    contentType: "resume",
    status: "queued",
    personaSteps: enabled.map((p) => ({
      personaId: p.id,
      status: "pending",
      attempts: 0,
    })),
  });

  const finalRun = await runStructurePersonasAggregate(
    container,
    analysis.id,
    content.id,
    normalized.id,
  );
  assert.ok(finalRun?.reportId, "resume report expected");
  assert.equal(finalRun?.contentType, "resume");
  assert.equal(finalRun?.promptVersions?.structureSpecId, "structure/resume");
  assert.ok(
    (finalRun?.capabilityExecutions?.length ?? 0) >= 1,
    "structure execution metadata expected",
  );

  const structured = await container.contents.getVersionById(finalRun!.contentVersionId!);
  assert.ok(structured?.structuredResume, "structuredResume stored");
  assert.ok(!structured?.structuredLinkedInProfile);
  assert.equal(structured?.structureSpecId, "structure/resume");

  const report = await container.analyses.getReport(finalRun!.reportId!, USER);
  assert.ok(report?.promptVersions?.aggregateSpecId);
  assert.ok(report?.reportDefinition?.extraSections.some((s) => s.id === "skills"));
  assert.ok(report?.aiExecution?.provider);

  const bullet = structured!.structuredResume!.sections
    .flatMap((s) => s.bullets.map((b) => ({ sectionId: s.sectionId, ...b })))
    .find((b) => b.text);
  assert.ok(bullet, "resume bullet for rewrite expected");
  const rewritten = await container.rewrites.rewrite(USER, {
    analysisId: finalRun!.id,
    targetId: "experience_bullet",
    mode: "professional",
    sectionId: bullet!.sectionId,
    bulletId: bullet!.bulletId,
  });
  assert.ok(rewritten.rewrittenText);
  assert.ok(rewritten.explanation);
  assert.equal(rewritten.originalText, bullet!.text);
  assert.equal(rewritten.targetId, "experience_bullet");
  assert.ok(rewritten.promptVersions.rewriteSpecId);
}

async function testLinkedInPipeline(container: Container) {
  const { analysisId, contentId } = await container.impressions.startFromLinkedInPaste(
    USER,
    LINKEDIN_TEXT,
  );

  const checksum = createHash("sha256").update(LINKEDIN_TEXT.trim(), "utf8").digest("hex");
  const ingest = createIngestProcessor(container);
  await ingest(
    fakeJob<LinkedInIngestJob>("linkedin", {
      analysisId,
      contentId,
      userId: USER,
      profileText: LINKEDIN_TEXT.trim(),
      checksumSha256: checksum,
    }),
  );

  const normalized = await container.contents.findNormalizedByPasteChecksum(contentId, checksum);
  assert.ok(normalized?.id, "linkedin normalized version expected");

  const finalRun = await runStructurePersonasAggregate(
    container,
    analysisId,
    contentId,
    normalized!.id,
  );
  assert.ok(finalRun?.reportId, "linkedin report expected");
  assert.equal(finalRun?.contentType, "linkedin_profile");
  assert.equal(finalRun?.promptVersions?.structureSpecId, "structure/linkedin");
  assert.ok((finalRun?.capabilityExecutions?.length ?? 0) >= 1);

  const structured = await container.contents.getVersionById(finalRun!.contentVersionId!);
  assert.ok(structured?.structuredLinkedInProfile, "structuredLinkedInProfile stored");
  assert.ok(!structured?.structuredResume);

  const raw = await container.contents.getVersionById(normalized!.id);
  assert.ok(raw?.normalizedText?.includes("Alex Chen"), "raw paste persisted");
}

async function testInstagramPipeline(container: Container) {
  const caption = "Slow mornings and a warm mug. #slowmorning";
  const { analysisId, contentId } = await container.impressions.startFromInstagram(
    USER,
    {
      image: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
      caption,
      hashtags: ["slowmorning"],
    },
  );

  const imageBuf = Buffer.from(SAMPLE_PNG_BASE64, "base64");
  const checksum = createHash("sha256")
    .update(imageBuf)
    .update("\n")
    .update(caption, "utf8")
    .update("\n")
    .update("slowmorning", "utf8")
    .digest("hex");

  const ingest = createIngestProcessor(container);
  await ingest(
    fakeJob<InstagramIngestJob>("instagram", {
      analysisId,
      contentId,
      userId: USER,
      storageKey: `users/${USER}/contents/${contentId}/instagram.png`,
      originalFilename: "instagram-post.png",
      mimeType: "image/png",
      sizeBytes: imageBuf.length,
      checksumSha256: checksum,
      caption,
      hashtags: ["slowmorning"],
      normalizedText: JSON.stringify({ caption, hashtags: ["slowmorning"] }),
    }),
  );

  const normalized = await container.contents.findNormalizedByChecksum(contentId, checksum);
  assert.ok(normalized?.id, "instagram normalized version expected");
  assert.ok(normalized?.sourceFile?.storageKey, "instagram image stored");

  const finalRun = await runStructurePersonasAggregate(
    container,
    analysisId,
    contentId,
    normalized!.id,
  );
  assert.ok(finalRun?.reportId, "instagram report expected");
  assert.equal(finalRun?.contentType, "instagram_post");
  assert.equal(finalRun?.promptVersions?.structureSpecId, "structure/instagram");
  assert.ok((finalRun?.capabilityExecutions?.length ?? 0) >= 1);

  const structured = await container.contents.getVersionById(finalRun!.contentVersionId!);
  assert.ok(structured?.structuredInstagramPost, "structuredInstagramPost stored");
  assert.ok(!structured?.structuredResume);
  assert.ok(!structured?.structuredLinkedInProfile);
  assert.equal(structured?.structuredInstagramPost?.mediaItems[0]?.mediaItemId, "media_0");
  assert.equal(
    structured?.structuredInstagramPost?.mediaItems[0]?.regions[0]?.imageRegionId,
    "media_0_region_0",
  );
}

async function main() {
  if (process.env.OPENAI_API_KEY) {
    console.warn("integration: unset OPENAI_API_KEY to force StubLlmGateway");
  }

  const mongo = await MongoMemoryServer.create();
  const logger = createPinoLogger();
  const db = await connectMongo(mongo.getUri(), logger);
  const container = createContainer(db);
  patchQueueSideEffects(container);
  await seedPersonas(container);

  try {
    await testResumePipeline(container);
    await testLinkedInPipeline(container);
    await testInstagramPipeline(container);
    console.log("pipeline.integration: ok");
  } finally {
    await container.redis.quit();
    await disconnectMongo();
    await mongo.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
