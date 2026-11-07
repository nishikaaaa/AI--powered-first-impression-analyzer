import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { createContainer } from "./composition/create-container.js";
import { connectMongo } from "./infrastructure/db/mongo-client.js";
import { createRoutes } from "./product/app/routes.js";
import { createPinoLogger } from "./infrastructure/ports/impl/pino-logger.js";

async function bootstrap() {
  const logger = createPinoLogger();
  const db = await connectMongo(env.mongodbUri, logger);
  const container = createContainer(db);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "40mb" }));
  app.use(createRoutes(container));

  app.listen(env.port, () => {
    logger.info(`API listening on :${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
