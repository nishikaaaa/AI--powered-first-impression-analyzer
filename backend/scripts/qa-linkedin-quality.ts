/**
 * LinkedIn pipeline QA: structure → 4 personas → aggregate per fixture.
 * Run: npx tsx scripts/qa-linkedin-quality.ts
 * Optional: QA_FIXTURE_IDS=student_undergrad,weak_minimal QA_MAX=5
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createContainer } from "../src/composition/create-container.js";
import { connectMongo, disconnectMongo } from "../src/infrastructure/db/mongo-client.js";
import { createPinoLogger } from "../src/infrastructure/ports/impl/pino-logger.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "../src/config/env.js";
import type { PersonaDefinition } from "../src/domain/persona/persona-definition.js";
import type { PersonaAnalysis } from "../src/domain/analysis/persona-analysis.js";
import type { AggregateReport } from "../src/domain/analysis/aggregate-report.js";
import { validatePersonaAnalysisLinkedIn } from "../src/platform/ai/validation/validateOutput.js";
import { structuredLinkedInProfileSchema } from "../src/platform/ai/validation/schemas/structured-linkedin.schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = path.join(__dirname, "../fixtures/linkedin-profiles.json");
const OUT_PATH = path.join(__dirname, "../fixtures/qa-linkedin-results.json");

const PERSONAS: PersonaDefinition[] = [
  {
    id: "recruiter",
    displayName: "Recruiter",
    contentTypes: ["resume", "linkedin_profile"],
    contextSpecId: "persona/recruiter",
    contextSpecVersion: 1,
    qualityTier: "standard",
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
    qualityTier: "premium",
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
    qualityTier: "premium",
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
    qualityTier: "standard",
    enabled: true,
    sortOrder: 40,
    version: 1,
  },
];

type Fixture = { id: string; archetype: string; profileText: string };

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function collectClaims(pa: PersonaAnalysis): string[] {
  return [
    pa.firstImpression,
    ...pa.claims.map((c) => c.statement),
  ];
}

async function main() {
  const usingStub = !env.openaiApiKey;
  console.log(usingStub ? "QA mode: StubLlmGateway (prompt quality NOT evaluated)" : "QA mode: OpenAI");

  const mongo = await MongoMemoryServer.create();
  const logger = createPinoLogger();
  const db = await connectMongo(mongo.getUri(), logger);
  const container = createContainer(db);

  const raw = await readFile(FIXTURES_PATH, "utf8");
  let fixtures = JSON.parse(raw) as Fixture[];

  const filterIds = process.env.QA_FIXTURE_IDS?.split(",").map((s) => s.trim());
  if (filterIds?.length) {
    fixtures = fixtures.filter((f) => filterIds.includes(f.id));
  }
  const max = process.env.QA_MAX ? Number(process.env.QA_MAX) : fixtures.length;
  fixtures = fixtures.slice(0, max);

  const results: unknown[] = [];

  for (const fixture of fixtures) {
    console.log(`\n--- ${fixture.id} (${fixture.archetype}) ---`);
    const structure = await container.ai.invoke("structureLinkedInProfile", {
      normalizedText: fixture.profileText,
    });
    if (structure.status === "failed" || !structure.data) {
      results.push({
        fixtureId: fixture.id,
        archetype: fixture.archetype,
        error: "structure_failed",
        message: structure.error?.message,
      });
      continue;
    }
    const profile = structure.data.structuredLinkedInProfile;
    const parsedProfile = structuredLinkedInProfileSchema.parse(profile);

    const personaOutputs: Record<string, PersonaAnalysis> = {};
    const personaMeta: Record<string, { valid: boolean; errors: string[] }> = {};

    for (const persona of PERSONAS) {
      const res = await container.ai.invoke("analyzePersona", {
        analysisRunId: `qa-${fixture.id}`,
        persona,
        contentType: "linkedin_profile",
        structuredLinkedInProfile: parsedProfile,
      });
      if (res.status === "failed" || !res.data) {
        personaMeta[persona.id] = {
          valid: false,
          errors: [res.error?.message ?? "failed"],
        };
        continue;
      }
      const draft = res.data.personaAnalysis;
      const validation = validatePersonaAnalysisLinkedIn(draft, parsedProfile);
      personaOutputs[persona.id] = draft;
      personaMeta[persona.id] = {
        valid: validation.valid,
        errors: validation.errors,
      };
    }

    const personaList = Object.values(personaOutputs);
    const availability = PERSONAS.map((p) => ({
      personaId: p.id,
      displayName: p.displayName,
      status: personaOutputs[p.id] ? ("available" as const) : ("unavailable" as const),
    }));

    let aggregate: AggregateReport | null = null;
    let aggregateError: string | null = null;
    if (personaList.length >= 3) {
      const agg = await container.ai.invoke("aggregatePerspectives", {
        analysisRunId: `qa-${fixture.id}`,
        contentVersionId: "qa-version",
        contentType: "linkedin_profile",
        structuredLinkedInProfile: parsedProfile,
        personaAnalyses: personaList,
        availability,
      });
      if (agg.status === "success" && agg.data) {
        aggregate = agg.data.aggregateReport;
      } else {
        aggregateError = agg.error?.message ?? "aggregate failed";
      }
    }

    const impressions = PERSONAS.map((p) => personaOutputs[p.id]?.firstImpression ?? "");
    const pairs: { a: string; b: string; sim: number }[] = [];
    for (let i = 0; i < PERSONAS.length; i++) {
      for (let j = i + 1; j < PERSONAS.length; j++) {
        const sim = jaccard(tokenSet(impressions[i] ?? ""), tokenSet(impressions[j] ?? ""));
        pairs.push({ a: PERSONAS[i]!.id, b: PERSONAS[j]!.id, sim });
      }
    }

    const allStatements = personaList.flatMap((p) => collectClaims(p));
    const resumeMentions = allStatements.filter((s) => /\bresume\b|\bcv\b|\bats\b/i.test(s)).length;
    const aggText = aggregate
      ? [
          aggregate.executiveSummary,
          aggregate.overallFirstImpression,
          ...aggregate.synthesisClaims.map((c) => c.statement),
        ].join(" ")
      : "";
    const aggResumeMentions = (aggText.match(/\bresume\b|\bcv\b|\bats\b/gi) ?? []).length;

    const linkedInThemes = [
      "headline",
      "about",
      "quantify",
      "featured",
      "skills",
      "positioning",
    ];
    const themeHits = linkedInThemes.filter((t) => aggText.toLowerCase().includes(t));

    results.push({
      fixtureId: fixture.id,
      archetype: fixture.archetype,
      structureValid: structure.validation.valid,
      personaMeta,
      personaDifferentiation: pairs,
      maxImpressionSimilarity: Math.max(...pairs.map((p) => p.sim), 0),
      personaResumeWordMentions: resumeMentions,
      aggregateError,
      aggregateResumeMentions: aggResumeMentions,
      aggregateThemeHits: themeHits,
      sample: {
        recruiter: personaOutputs.recruiter?.firstImpression?.slice(0, 200),
        em: personaOutputs.engineering_manager?.firstImpression?.slice(0, 200),
        founder: personaOutputs.founder?.firstImpression?.slice(0, 200),
        hr: personaOutputs.hr?.firstImpression?.slice(0, 200),
        executiveSummary: aggregate?.executiveSummary?.slice(0, 300),
      },
    });
  }

  await writeFile(OUT_PATH, JSON.stringify({ usingStub, results }, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);

  await container.redis.quit();
  await disconnectMongo();
  await mongo.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
