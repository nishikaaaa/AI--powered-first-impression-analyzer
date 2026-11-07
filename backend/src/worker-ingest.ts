import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { createContainer } from "./composition/create-container.js";
import { connectMongo } from "./infrastructure/db/mongo-client.js";
import { createExtractProcessor } from "./infrastructure/queue/processors/extract.processor.js";
import { QUEUE_INGEST } from "./infrastructure/queue/job-names.js";
import { createPinoLogger } from "./infrastructure/ports/impl/pino-logger.js";

async function main() {
  const logger = createPinoLogger();
  const db = await connectMongo(env.mongodbUri, logger);
  const container = createContainer(db);

  const worker = new Worker(QUEUE_INGEST, createExtractProcessor(container), {
    connection: container.redis,
    concurrency: 2,
  });

  worker.on("failed", (job, err) => {
    container.logger.error("ingest job failed", {
      jobId: job?.id,
      err: err.message,
    });
  });

  container.logger.info("Ingest worker running");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
