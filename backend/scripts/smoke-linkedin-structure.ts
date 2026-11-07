/**
 * Phase 1 manual smoke: invoke structureLinkedInProfile without Mongo/BullMQ.
 * Run: npm run smoke:linkedin-structure
 */
import { StructureLinkedInProfileCapability } from "../src/platform/ai/capabilities/structureLinkedInProfile.js";
import { ContextBuilder } from "../src/platform/ai/context/ContextBuilder.js";
import { StubLlmGateway } from "../src/platform/ai/gateway/LlmGateway.js";
import { NoOpCostRecorder, NoOpExecutionRecorder } from "../src/infrastructure/ports/impl/noop-stubs.js";
import { SystemClock } from "../src/infrastructure/ports/impl/system-clock.js";

const SAMPLE = `
Alex Chen
Senior Software Engineer | Backend
San Francisco Bay Area

About
Backend engineer focused on distributed systems.

Experience
Example Co — Senior Software Engineer
2021 – Present
• Led API platform serving 2M daily users.

Skills
TypeScript, Node.js
`;

async function main() {
  const cap = new StructureLinkedInProfileCapability(
    new ContextBuilder(),
    new StubLlmGateway(),
    new SystemClock(),
    new NoOpExecutionRecorder(),
    new NoOpCostRecorder(),
  );
  const result = await cap.execute({ normalizedText: SAMPLE });
  console.log(JSON.stringify({ status: result.status, validation: result.validation }, null, 2));
  if (result.status !== "success" || !result.data) {
    process.exitCode = 1;
    return;
  }
  console.log("schemaVersion:", result.data.structuredLinkedInProfile.schemaVersion);
  console.log("experience sections:", result.data.structuredLinkedInProfile.experience.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
