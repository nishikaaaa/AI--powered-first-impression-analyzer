import { MongoClient, type Db } from "mongodb";
import type { Logger } from "../../platform/ai/ports/Logger.js";
import { ensureMongoIndexes } from "./mongo-indexes.js";

let client: MongoClient | undefined;

export async function connectMongo(uri: string, log: Logger): Promise<Db> {
  client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await ensureMongoIndexes(db);
  log.info("MongoDB connected");
  return db;
}

export async function disconnectMongo(): Promise<void> {
  await client?.close();
}
