import { z } from "zod";

export const instagramRegionPositionSchema = z.object({
  vertical: z.enum(["top", "center", "bottom", "unknown"]),
  horizontal: z.enum(["left", "center", "right", "unknown"]),
});

export const instagramImageRegionSchema = z.object({
  imageRegionId: z.string().min(1),
  kind: z.enum([
    "person",
    "product",
    "logo",
    "text_overlay",
    "scene",
    "object",
    "background",
    "other",
  ]),
  label: z.string().min(1),
  description: z.string().min(1),
  position: instagramRegionPositionSchema,
});

export const instagramMediaItemSchema = z.object({
  mediaItemId: z.string().min(1),
  mediaType: z.literal("image"),
  mimeType: z.string().min(1).optional(),
  orientation: z.enum(["portrait", "landscape", "square"]).optional(),
  aspectHint: z.string().min(1).optional(),
  visualStyle: z.string().min(1).optional(),
  regions: z.array(instagramImageRegionSchema).min(1),
});

export const instagramDetectedTextSchema = z.object({
  detectedTextId: z.string().min(1),
  text: z.string().min(1),
  imageRegionId: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const instagramCaptionSectionSchema = z.object({
  sectionId: z.string().min(1),
  kind: z.enum(["full", "line"]),
  text: z.string(),
});

export const instagramCaptionSchema = z.object({
  original: z.string(),
  normalized: z.string(),
  sections: z.array(instagramCaptionSectionSchema).min(1),
});

export const instagramHashtagSchema = z.object({
  hashtagId: z.string().min(1),
  tag: z.string().min(1),
});

export const instagramCompositionSchema = z.object({
  sectionId: z.string().min(1),
  layout: z.string().min(1).optional(),
  lighting: z.string().min(1).optional(),
  colorPalette: z.array(z.string().min(1)),
  focalPointRegionId: z.string().min(1).optional(),
});

export const instagramBrandingSchema = z.object({
  sectionId: z.string().min(1),
  brandName: z.string().min(1).optional(),
  logoVisible: z.boolean().optional(),
  logoRegionId: z.string().min(1).optional(),
  brandCues: z.string().min(1).optional(),
});

export const structuredInstagramPostSchema = z.object({
  schemaVersion: z.literal("1.0"),
  mediaItems: z.array(instagramMediaItemSchema).min(1),
  composition: instagramCompositionSchema,
  branding: instagramBrandingSchema,
  detectedText: z.array(instagramDetectedTextSchema),
  caption: instagramCaptionSchema,
  hashtags: z.array(instagramHashtagSchema),
});
