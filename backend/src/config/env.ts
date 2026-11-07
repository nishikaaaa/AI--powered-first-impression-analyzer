import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: req("MONGODB_URI", "mongodb://localhost:27017/first_impression"),
  redisUrl: req("REDIS_URL", "redis://localhost:6379"),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiStructureModel: process.env.OPENAI_STRUCTURE_MODEL ?? "gpt-4o-mini",
  openaiPersonaModel: process.env.OPENAI_PERSONA_MODEL ?? "gpt-4o",
  openaiAggregateModel: process.env.OPENAI_AGGREGATE_MODEL ?? "gpt-4o",
  storageMode: (process.env.STORAGE_MODE ?? "local") as "local" | "s3",
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? "./data/uploads",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  minPersonasForAggregate: Number(process.env.MIN_PERSONAS_FOR_AGGREGATE ?? 3),
  mvpUserId: process.env.MVP_USER_ID ?? "dev-user",
};
