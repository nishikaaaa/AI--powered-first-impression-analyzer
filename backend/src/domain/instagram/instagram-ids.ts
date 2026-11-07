export const COMPOSITION_SECTION_ID = "composition_main";
export const BRANDING_SECTION_ID = "branding_main";
export const CAPTION_MAIN_SECTION_ID = "caption_main";

export function mediaItemId(mediaIndex: number): string {
  return `media_${mediaIndex}`;
}

export function imageRegionId(mediaIndex: number, regionIndex: number): string {
  return `media_${mediaIndex}_region_${regionIndex}`;
}

export function captionLineSectionId(lineIndex: number): string {
  return `caption_line_${lineIndex}`;
}

export function hashtagSectionId(hashtagIndex: number): string {
  return `hashtag_${hashtagIndex}`;
}

export function detectedTextEntryId(textIndex: number): string {
  return `detected_text_${textIndex}`;
}

export function parseRegionIndex(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.trim());
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return undefined;
}

export type InstagramEvidenceIndex = {
  sectionIds: Set<string>;
  bulletsBySection: Map<string, Set<string>>;
};

export function collectInstagramEvidenceIndex(post: {
  mediaItems: { mediaItemId: string; regions: { imageRegionId: string }[] }[];
  composition: { sectionId: string; focalPointRegionId?: string };
  branding: { sectionId: string; logoRegionId?: string };
  detectedText: { detectedTextId: string; imageRegionId: string }[];
  caption: { sections: { sectionId: string }[] };
  hashtags: { hashtagId: string }[];
}): InstagramEvidenceIndex {
  const sectionIds = new Set<string>();
  const bulletsBySection = new Map<string, Set<string>>();
  const addSection = (id: string) => {
    sectionIds.add(id);
    if (!bulletsBySection.has(id)) bulletsBySection.set(id, new Set());
  };

  for (const item of post.mediaItems) {
    addSection(item.mediaItemId);
    for (const region of item.regions) {
      addSection(region.imageRegionId);
    }
  }
  addSection(post.composition.sectionId);
  addSection(post.branding.sectionId);
  for (const section of post.caption.sections) addSection(section.sectionId);
  for (const tag of post.hashtags) addSection(tag.hashtagId);
  for (const entry of post.detectedText) {
    addSection(entry.detectedTextId);
    bulletsBySection.get(entry.imageRegionId)?.add(entry.detectedTextId);
  }
  return { sectionIds, bulletsBySection };
}
