import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { createContainer } from "./composition/create-container.js";
import { connectMongo } from "./infrastructure/db/mongo-client.js";
import {
  createCapabilityProcessor,
  recoverPersonaStepFromJob,
} from "./infrastructure/queue/processors/capability.processor.js";
import { QUEUE_CAPABILITY } from "./infrastructure/queue/job-names.js";
import { createPinoLogger } from "./infrastructure/ports/impl/pino-logger.js";

async function main() {
  const logger = createPinoLogger();
  const db = await connectMongo(env.mongodbUri, logger);
  const container = createContainer(db);

  const worker = new Worker(
    QUEUE_CAPABILITY,
    createCapabilityProcessor(container),
    {
      connection: container.redis,
      concurrency: 4,
      maxStalledCount: 2,
    },
  );

  worker.on("failed", (job, err) => {
    container.logger.error("capability job failed", {
      jobId: job?.id,
      name: job?.name,
      err: err.message,
    });
    void recoverPersonaStepFromJob(container, job, "failed");
  });

  worker.on("stalled", (jobId) => {
    void container.capabilityQueue.getJob(jobId).then((job) =>
      recoverPersonaStepFromJob(container, job ?? undefined, "stalled"),
    );
  });

  container.logger.info("Capability worker running");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
