export type InstagramNormalizedPayload = {
  caption: string;
  hashtags: string[];
};

export function serializeInstagramNormalized(
  payload: InstagramNormalizedPayload,
): string {
  return JSON.stringify({
    caption: payload.caption,
    hashtags: payload.hashtags,
  });
}

export function parseInstagramNormalized(text: string): InstagramNormalizedPayload {
  const parsed = JSON.parse(text) as {
    caption?: unknown;
    hashtags?: unknown;
  };
  const caption = typeof parsed.caption === "string" ? parsed.caption : "";
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((h): h is string => typeof h === "string")
    : [];
  return { caption, hashtags };
}

export function extractHashtagsFromCaption(caption: string): string[] {
  const tags: string[] = [];
  const re = /#([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(caption)) !== null) {
    const tag = match[1];
    if (tag) tags.push(tag);
  }
  return tags;
}

export function normalizeHashtagTag(raw: string): string | undefined {
  const tag = raw.trim().replace(/^#+/, "").trim();
  return tag.length ? tag : undefined;
}

/** First-seen order, case-insensitive de-dupe, no leading #. */
export function mergeHashtagTags(...groups: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const raw of group ?? []) {
      const tag = normalizeHashtagTag(raw);
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}
