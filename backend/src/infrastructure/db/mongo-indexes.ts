import type { Db } from "mongodb";

/** #9 — indexes required for production lookups (idempotent createIndex calls). */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  await db.collection("analyses").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("analyses").createIndex({ contentId: 1 });
  await db.collection("persona_results").createIndex(
    { analysisRunId: 1, personaId: 1 },
    { unique: true },
  );
  await db.collection("content_versions").createIndex({ contentId: 1, kind: 1 });
  await db.collection("content_versions").createIndex({
    contentId: 1,
    "sourceFile.checksumSha256": 1,
    kind: 1,
  });
  await db.collection("content_versions").createIndex({
    contentId: 1,
    "sourcePaste.checksumSha256": 1,
    kind: 1,
  });
  await db.collection("content_versions").createIndex({
    contentId: 1,
    parentContentVersionId: 1,
    kind: 1,
  });
  await db.collection("reports").createIndex({ analysisRunId: 1 }, { unique: true });
}
