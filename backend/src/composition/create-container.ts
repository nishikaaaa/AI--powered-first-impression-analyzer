import { Redis } from "ioredis";
import { Queue } from "bullmq";
import type { Db } from "mongodb";
import { env } from "../config/env.js";
import { AiPlatform } from "../platform/ai/AiPlatform.js";
import { AggregatePerspectivesCapability } from "../platform/ai/capabilities/aggregatePerspectives.js";
import { AnalyzePersonaCapability } from "../platform/ai/capabilities/analyzePersona.js";
import { StructureDocumentCapability } from "../platform/ai/capabilities/structureDocument.js";
import { StructureInstagramPostCapability } from "../platform/ai/capabilities/structureInstagramPost.js";
import { StructureLinkedInProfileCapability } from "../platform/ai/capabilities/structureLinkedInProfile.js";
import { RewriteContentCapability } from "../platform/ai/capabilities/rewriteContent.js";
import { RewriteService } from "../product/analysis/rewrite.service.js";
import { ContextBuilder } from "../platform/ai/context/ContextBuilder.js";
import { OpenAiLlmGateway, StubLlmGateway, type LlmGateway } from "../platform/ai/gateway/LlmGateway.js";
import { AnalysisRepository } from "../infrastructure/db/repositories/analysis.repository.js";
import { ContentRepository } from "../infrastructure/db/repositories/content.repository.js";
import { PersonaRepository } from "../infrastructure/db/repositories/persona.repository.js";
import { RedisCacheProvider } from "../infrastructure/ports/impl/redis-cache.js";
import { RedisNotificationPublisher } from "../infrastructure/ports/impl/redis-notifications.js";
import {
  NoOpCostRecorder,
  NoOpEvaluationRunner,
  NoOpExecutionRecorder,
  NoOpFeatureFlags,
} from "../infrastructure/ports/impl/noop-stubs.js";
import { createPinoLogger } from "../infrastructure/ports/impl/pino-logger.js";
import { SystemClock } from "../infrastructure/ports/impl/system-clock.js";
import { LocalObjectStorage } from "../infrastructure/storage/local-storage.js";
import { S3ObjectStorage } from "../infrastructure/storage/s3-storage.js";
import type { ObjectStorage } from "../infrastructure/storage/storage.port.js";
import { AnalysisCoordinator } from "../product/analysis/analysis-coordinator.js";
import { ImpressionService } from "../product/analysis/impression.service.js";
import { QUEUE_CAPABILITY, QUEUE_INGEST } from "../infrastructure/queue/job-names.js";

export type Container = {
  db: Db;
  redis: Redis;
  logger: ReturnType<typeof createPinoLogger>;
  ai: AiPlatform;
  contents: ContentRepository;
  analyses: AnalysisRepository;
  personas: PersonaRepository;
  storage: ObjectStorage;
  impressions: ImpressionService;
  rewrites: RewriteService;
  coordinator: AnalysisCoordinator;
  notifications: RedisNotificationPublisher;
  ingestQueue: Queue;
  capabilityQueue: Queue;
};

export function createContainer(db: Db): Container {
  const logger = createPinoLogger();
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  const clock = new SystemClock();
  const executions = new NoOpExecutionRecorder();
  const costs = new NoOpCostRecorder();
  void new NoOpFeatureFlags();
  void new NoOpEvaluationRunner();
  void new RedisCacheProvider(redis);

  const storage: ObjectStorage =
    env.storageMode === "s3"
      ? new S3ObjectStorage(env.s3Bucket, env.s3Region)
      : new LocalObjectStorage(env.localStorageDir);

  let gateway: LlmGateway;
  if (env.openaiApiKey) {
    gateway = new OpenAiLlmGateway(
      env.openaiApiKey,
      {
        extractionStandard: env.openaiStructureModel,
        reasoningStandard: env.openaiPersonaModel,
        reasoningPremium: env.openaiPersonaModel,
        synthesisPremium: env.openaiAggregateModel,
      },
      logger,
    );
  } else {
    logger.warn("OPENAI_API_KEY missing — using StubLlmGateway");
    gateway = new StubLlmGateway();
  }

  const ctx = new ContextBuilder();
  const ai = new AiPlatform(
    new StructureDocumentCapability(ctx, gateway, clock, executions, costs),
    new StructureLinkedInProfileCapability(ctx, gateway, clock, executions, costs),
    new StructureInstagramPostCapability(ctx, gateway, clock, executions, costs),
    new AnalyzePersonaCapability(ctx, gateway, clock, executions, costs),
    new AggregatePerspectivesCapability(ctx, gateway, clock, executions, costs),
    new RewriteContentCapability(ctx, gateway, clock, executions, costs),
  );

  const contents = new ContentRepository(db);
  const analyses = new AnalysisRepository(db);
  const personas = new PersonaRepository(db);
  const notifications = new RedisNotificationPublisher(redis);

  const connection = { connection: redis };
  const ingestQueue = new Queue(QUEUE_INGEST, connection);
  const capabilityQueue = new Queue(QUEUE_CAPABILITY, connection);

  const coordinator = new AnalysisCoordinator(
    analyses,
    personas,
    notifications,
    capabilityQueue,
  );

  const impressions = new ImpressionService(
    contents,
    analyses,
    personas,
    storage,
    ingestQueue,
  );
  const rewrites = new RewriteService(ai, contents, analyses);

  return {
    db,
    redis,
    logger,
    ai,
    contents,
    analyses,
    personas,
    storage,
    impressions,
    rewrites,
    coordinator,
    notifications,
    ingestQueue,
    capabilityQueue,
  };
}
