const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

export type ParsedInstagramImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

function sniffImageMime(buffer: Buffer): string | undefined {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a") return "image/gif";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return undefined;
}

export const MAX_INSTAGRAM_IMAGES = 10;

export function parseInstagramImage(image: unknown): ParsedInstagramImage {
  if (typeof image !== "string" || !image.trim()) {
    throw new Error("VALIDATION: image required");
  }
  const trimmed = image.trim();
  const dataUrl = trimmed.match(DATA_URL);
  let buffer: Buffer;
  let mimeType: string | undefined;
  if (dataUrl) {
    mimeType = dataUrl[1];
    buffer = Buffer.from((dataUrl[2] ?? "").replace(/\s/g, ""), "base64");
  } else {
    buffer = Buffer.from(trimmed.replace(/\s/g, ""), "base64");
    mimeType = sniffImageMime(buffer);
  }
  if (!buffer.length) {
    throw new Error("VALIDATION: image is empty");
  }
  mimeType = mimeType ?? sniffImageMime(buffer);
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
    throw new Error("VALIDATION: unsupported image type (jpeg, png, webp, gif)");
  }
  return { buffer, mimeType, extension: extensionFor(mimeType) };
}

/** Accept `images[]` (carousel) or a single `image`. Order is preserved. */
export function parseInstagramImages(input: {
  image?: unknown;
  images?: unknown;
}): ParsedInstagramImage[] {
  const raw: unknown[] = [];
  if (Array.isArray(input.images) && input.images.length > 0) {
    raw.push(...input.images);
  } else if (input.image != null && input.image !== "") {
    raw.push(input.image);
  }
  if (raw.length === 0) {
    throw new Error("VALIDATION: image required");
  }
  if (raw.length > MAX_INSTAGRAM_IMAGES) {
    throw new Error(`VALIDATION: maximum ${MAX_INSTAGRAM_IMAGES} images per post`);
  }
  return raw.map((item, index) => {
    try {
      return parseInstagramImage(item);
    } catch (e) {
      const message = e instanceof Error ? e.message.replace(/^VALIDATION:\s*/, "") : "invalid image";
      throw new Error(`VALIDATION: image ${index + 1}: ${message}`);
    }
  });
}
