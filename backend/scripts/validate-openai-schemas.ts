/**
 * Smoke-check: schemas are objects OpenAI strict mode accepts structurally.
 * Run: npx tsx scripts/validate-openai-schemas.ts
 * With OPENAI_API_KEY set, also sends a minimal parse request per schema.
 */
import OpenAI from "openai";
import {
  OPENAI_SCHEMA_NAMES,
  aggregateOpenAiSchema,
  contentRewriteOpenAiSchema,
  personaAnalysisOpenAiSchema,
  structuredInstagramOpenAiSchema,
  structuredLinkedInOpenAiSchema,
  structuredResumeOpenAiSchema,
} from "../src/platform/ai/validation/openai-schemas.js";

const SCHEMAS: { name: string; schema: Record<string, unknown> }[] = [
  { name: OPENAI_SCHEMA_NAMES.structuredResume, schema: structuredResumeOpenAiSchema as unknown as Record<string, unknown> },
  { name: OPENAI_SCHEMA_NAMES.structuredLinkedIn, schema: structuredLinkedInOpenAiSchema as unknown as Record<string, unknown> },
  { name: OPENAI_SCHEMA_NAMES.structuredInstagram, schema: structuredInstagramOpenAiSchema as unknown as Record<string, unknown> },
  { name: OPENAI_SCHEMA_NAMES.personaAnalysis, schema: personaAnalysisOpenAiSchema as unknown as Record<string, unknown> },
  { name: OPENAI_SCHEMA_NAMES.aggregateReport, schema: aggregateOpenAiSchema as unknown as Record<string, unknown> },
  { name: OPENAI_SCHEMA_NAMES.contentRewrite, schema: contentRewriteOpenAiSchema as unknown as Record<string, unknown> },
];

function assertStrictShape(schema: Record<string, unknown>, path = "root"): void {
  if (schema.type === "object") {
    if (schema.additionalProperties !== false) {
      throw new Error(`${path}: object must have additionalProperties: false`);
    }
    const props = schema.properties as Record<string, unknown> | undefined;
    const required = schema.required as string[] | undefined;
    if (!props || !required) {
      throw new Error(`${path}: object must have properties and required`);
    }
    for (const key of Object.keys(props)) {
      if (!required.includes(key)) {
        throw new Error(`${path}: property "${key}" missing from required[]`);
      }
      assertStrictShape(props[key] as Record<string, unknown>, `${path}.${key}`);
    }
  }
  if (schema.type === "array" && schema.items) {
    assertStrictShape(schema.items as Record<string, unknown>, `${path}[]`);
  }
}

async function main() {
  for (const { name, schema } of SCHEMAS) {
    assertStrictShape(schema);
    console.log("strict shape ok:", name);
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log("OPENAI_API_KEY not set — skipping live API schema probe");
    return;
  }

  const client = new OpenAI({ apiKey: key });
  const model = process.env.OPENAI_STRUCTURE_MODEL ?? "gpt-4o-mini";

  for (const { name, schema } of SCHEMAS) {
    try {
      await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Return minimal valid JSON for the schema only." }],
        max_tokens: 16,
        response_format: {
          type: "json_schema",
          json_schema: { name, strict: true, schema },
        },
      });
      console.log("openai accepted schema:", name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("openai rejected schema:", name, msg.slice(0, 200));
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
