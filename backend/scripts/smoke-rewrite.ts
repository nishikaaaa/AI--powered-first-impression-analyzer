/**
 * Manual smoke: invoke rewriteContent without Mongo/BullMQ.
 * Run: npm run smoke:rewrite
 */
import { RewriteContentCapability } from "../src/platform/ai/capabilities/rewriteContent.js";
import { ContextBuilder } from "../src/platform/ai/context/ContextBuilder.js";
import { StubLlmGateway } from "../src/platform/ai/gateway/LlmGateway.js";
import { NoOpCostRecorder, NoOpExecutionRecorder } from "../src/infrastructure/ports/impl/noop-stubs.js";
import { SystemClock } from "../src/infrastructure/ports/impl/system-clock.js";

async function main() {
  const cap = new RewriteContentCapability(
    new ContextBuilder(),
    new StubLlmGateway(),
    new SystemClock(),
    new NoOpExecutionRecorder(),
    new NoOpCostRecorder(),
  );
  const original = "Built APIs serving 1M requests/day.";
  const result = await cap.execute({
    contentType: "resume",
    targetId: "experience_bullet",
    mode: "professional",
    originalText: original,
    structured: {
      schemaVersion: "1.0",
      identity: { name: "Jane" },
      sections: [
        {
          sectionId: "exp_0",
          type: "experience",
          title: "Acme",
          bullets: [{ bulletId: "b1", text: original }],
        },
      ],
    },
    sectionId: "exp_0",
    bulletId: "b1",
  });
  console.log(JSON.stringify({ status: result.status, validation: result.validation }, null, 2));
  if (result.status !== "success" || !result.data) {
    process.exitCode = 1;
    return;
  }
  console.log("original:", result.data.rewrite.originalText);
  console.log("rewritten:", result.data.rewrite.rewrittenText);
  console.log("explanation:", result.data.rewrite.explanation);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
