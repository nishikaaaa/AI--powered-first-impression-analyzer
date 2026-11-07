export const QUEUE_INGEST = "pipeline.ingest";
export const QUEUE_CAPABILITY = "pipeline.capability";

export type ExtractJob = {
  analysisId: string;
  contentId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type LinkedInIngestJob = {
  analysisId: string;
  contentId: string;
  userId: string;
  profileText: string;
  checksumSha256: string;
};

export type InstagramIngestJob = {
  analysisId: string;
  contentId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  caption: string;
  hashtags: string[];
  normalizedText: string;
  images?: {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
  }[];
};

export type StructureJob = {
  analysisId: string;
  contentId: string;
  normalizedVersionId: string;
};

export type PersonaJob = {
  analysisId: string;
  contentVersionId: string;
  personaId: string;
};

export type AggregateJob = {
  analysisId: string;
  contentVersionId: string;
};
