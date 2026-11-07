import { MongoClient } from "mongodb";
import { env } from "../src/config/env.js";

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

async function main() {
  const client = new MongoClient(env.mongodbUri);
  await client.connect();
  const col = client.db().collection("personas");
  for (const p of PERSONAS) {
    await col.updateOne({ id: p.id }, { $set: p }, { upsert: true });
    console.log("upserted persona", p.id);
  }
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
