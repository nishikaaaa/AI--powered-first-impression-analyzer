/**
 * Starts in-process MongoDB + Redis for local testing when Docker is unavailable.
 * Keep this process running while the API, workers, and seed scripts run.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function keepAlive() {
  setInterval(() => {}, 1 << 30);
}

async function startMongo() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: "first_impression" },
  });
  console.log("mongo", mongod.getUri());
  return mongod;
}

async function startRedis() {
  let RedisMemoryServer;
  try {
    ({ RedisMemoryServer } = await import("redis-memory-server"));
  } catch {
    try {
      RedisMemoryServer = require("redis-memory-server").RedisMemoryServer;
    } catch (err) {
      throw new Error(
        "redis-memory-server is not installed. Run: npm install --no-save redis-memory-server",
        { cause: err },
      );
    }
  }
  const redis = new RedisMemoryServer({ instance: { port: 6379 } });
  const host = await redis.getHost();
  const port = await redis.getPort();
  console.log("redis", `redis://${host}:${port}`);
  return redis;
}

const mongo = await startMongo();
const redis = await startRedis();
console.log("local-infra ready");
process.on("SIGINT", async () => {
  await redis.stop();
  await mongo.stop();
  process.exit(0);
});
keepAlive();
