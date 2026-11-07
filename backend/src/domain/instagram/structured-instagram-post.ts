export type InstagramRegionKind =
  | "person"
  | "product"
  | "logo"
  | "text_overlay"
  | "scene"
  | "object"
  | "background"
  | "other";

export type InstagramRegionPosition = {
  vertical: "top" | "center" | "bottom" | "unknown";
  horizontal: "left" | "center" | "right" | "unknown";
};

/** Observable region inside a media item. IDs are assigned deterministically. */
export type InstagramImageRegion = {
  imageRegionId: string;
  kind: InstagramRegionKind;
  label: string;
  description: string;
  position: InstagramRegionPosition;
};

/**
 * One piece of media in the post. MVP always has a single image item;
 * the array shape is for future carousel / reel support.
 */
export type InstagramMediaItem = {
  mediaItemId: string;
  mediaType: "image";
  mimeType?: string;
  orientation?: "portrait" | "landscape" | "square";
  aspectHint?: string;
  visualStyle?: string;
  regions: InstagramImageRegion[];
};

export type InstagramDetectedText = {
  detectedTextId: string;
  text: string;
  imageRegionId: string;
  confidence: number;
};

export type InstagramCaptionSection = {
  sectionId: string;
  kind: "full" | "line";
  text: string;
};

export type InstagramCaption = {
  original: string;
  normalized: string;
  sections: InstagramCaptionSection[];
};

export type InstagramHashtag = {
  hashtagId: string;
  tag: string;
};

export type InstagramCompositionFacts = {
  sectionId: string;
  layout?: string;
  lighting?: string;
  colorPalette: string[];
  focalPointRegionId?: string;
};

export type InstagramBrandingFacts = {
  sectionId: string;
  brandName?: string;
  logoVisible?: boolean;
  logoRegionId?: string;
  brandCues?: string;
};

/**
 * Extractive Instagram post model: observable facts only.
 * Interpretation (quality, engagement, audience reaction) belongs in persona analysis.
 */
export type StructuredInstagramPost = {
  schemaVersion: "1.0";
  mediaItems: InstagramMediaItem[];
  composition: InstagramCompositionFacts;
  branding: InstagramBrandingFacts;
  detectedText: InstagramDetectedText[];
  caption: InstagramCaption;
  hashtags: InstagramHashtag[];
};
