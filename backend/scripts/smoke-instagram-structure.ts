/**
 * Phase 1 manual smoke: invoke structureInstagramPost without Mongo/BullMQ.
 * Run: npm run smoke:instagram-structure
 */
import { StructureInstagramPostCapability } from "../src/platform/ai/capabilities/structureInstagramPost.js";
import { ContextBuilder } from "../src/platform/ai/context/ContextBuilder.js";
import { StubLlmGateway } from "../src/platform/ai/gateway/LlmGateway.js";
import { NoOpCostRecorder, NoOpExecutionRecorder } from "../src/infrastructure/ports/impl/noop-stubs.js";
import { SystemClock } from "../src/infrastructure/ports/impl/system-clock.js";

/** 1x1 PNG — stub gateway does not inspect pixels. */
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function main() {
  const cap = new StructureInstagramPostCapability(
    new ContextBuilder(),
    new StubLlmGateway(),
    new SystemClock(),
    new NoOpExecutionRecorder(),
    new NoOpCostRecorder(),
  );
  const result = await cap.execute({
    image: { mimeType: "image/png", base64: SAMPLE_PNG_BASE64 },
    caption: "Slow mornings and a warm mug.",
    hashtags: ["slowmorning"],
  });
  console.log(JSON.stringify({ status: result.status, validation: result.validation }, null, 2));
  if (result.status !== "success" || !result.data) {
    process.exitCode = 1;
    return;
  }
  const post = result.data.structuredInstagramPost;
  console.log("schemaVersion:", post.schemaVersion);
  console.log("mediaItemId:", post.mediaItems[0]?.mediaItemId);
  console.log("regions:", post.mediaItems[0]?.regions.map((r) => r.imageRegionId).join(","));
  console.log("caption sections:", post.caption.sections.map((s) => s.sectionId).join(","));
  console.log("hashtags:", post.hashtags.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
