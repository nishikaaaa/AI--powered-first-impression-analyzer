import type { ContentType } from "../content/content-type.js";
import type { StructuredInstagramPost } from "../instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "./structured-resume.js";

export type ContentKind = "normalized" | "structured";

export type Content = {
  id: string;
  userId: string;
  contentType: ContentType;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentVersion = {
  id: string;
  contentId: string;
  kind: ContentKind;
  parentContentVersionId?: string;
  schemaVersion?: string;
  structureSpecId?: string;
  structureSpecVersion?: number;
  normalizedText?: string;
  structuredResume?: StructuredResume;
  structuredLinkedInProfile?: StructuredLinkedInProfile;
  structuredInstagramPost?: StructuredInstagramPost;
  sourceFile?: {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
  };
  /** Extra carousel slides; sourceFile is always the first image. */
  sourceFiles?: {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
  }[];
  sourcePaste?: {
    checksumSha256: string;
    charCount: number;
  };
  createdAt: Date;
};
