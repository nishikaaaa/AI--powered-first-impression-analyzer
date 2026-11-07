import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf.js v1 treats anything with byteLength as an ArrayBuffer view and may
  // parse Node's pooled Buffer backing store ("bad XRef entry" on Node 24).
  const copy = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const data = await pdf(copy as unknown as Buffer);
  const text = (data.text ?? "").trim();
  if (!text || text.length < 50) {
    throw new Error("UNPROCESSABLE_CONTENT: insufficient text extracted from PDF");
  }
  return text;
}
