export type QualityTier = "standard" | "premium";

export type PersonaDefinition = {
  id: string;
  displayName: string;
  contentTypes: string[];
  contextSpecId: string;
  contextSpecVersion: number;
  qualityTier: QualityTier;
  enabled: boolean;
  sortOrder: number;
  version: number;
};
