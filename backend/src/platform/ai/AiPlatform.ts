import type { CapabilityResult } from "./CapabilityResult.js";
import {
  AggregatePerspectivesCapability,
  type AggregatePerspectivesData,
  type AggregatePerspectivesInput,
} from "./capabilities/aggregatePerspectives.js";
import {
  AnalyzePersonaCapability,
  type AnalyzePersonaData,
  type AnalyzePersonaInput,
} from "./capabilities/analyzePersona.js";
import {
  StructureDocumentCapability,
  type StructureDocumentData,
  type StructureDocumentInput,
} from "./capabilities/structureDocument.js";
import {
  StructureLinkedInProfileCapability,
  type StructureLinkedInProfileData,
  type StructureLinkedInProfileInput,
} from "./capabilities/structureLinkedInProfile.js";
import {
  StructureInstagramPostCapability,
  type StructureInstagramPostData,
  type StructureInstagramPostInput,
} from "./capabilities/structureInstagramPost.js";
import {
  RewriteContentCapability,
  type RewriteContentData,
  type RewriteContentInput,
} from "./capabilities/rewriteContent.js";

export type CapabilityId =
  | "structureDocument"
  | "structureLinkedInProfile"
  | "structureInstagramPost"
  | "analyzePersona"
  | "aggregatePerspectives"
  | "rewriteContent";

export type CapabilityInputMap = {
  structureDocument: StructureDocumentInput;
  structureLinkedInProfile: StructureLinkedInProfileInput;
  structureInstagramPost: StructureInstagramPostInput;
  analyzePersona: AnalyzePersonaInput;
  aggregatePerspectives: AggregatePerspectivesInput;
  rewriteContent: RewriteContentInput;
};

export type CapabilityDataMap = {
  structureDocument: StructureDocumentData;
  structureLinkedInProfile: StructureLinkedInProfileData;
  structureInstagramPost: StructureInstagramPostData;
  analyzePersona: AnalyzePersonaData;
  aggregatePerspectives: AggregatePerspectivesData;
  rewriteContent: RewriteContentData;
};

export class AiPlatform {
  constructor(
    private readonly structureDocument: StructureDocumentCapability,
    private readonly structureLinkedInProfile: StructureLinkedInProfileCapability,
    private readonly structureInstagramPost: StructureInstagramPostCapability,
    private readonly analyzePersona: AnalyzePersonaCapability,
    private readonly aggregatePerspectives: AggregatePerspectivesCapability,
    private readonly rewriteContent: RewriteContentCapability,
  ) {}

  invoke<K extends CapabilityId>(
    capabilityId: K,
    input: CapabilityInputMap[K],
  ): Promise<CapabilityResult<CapabilityDataMap[K]>> {
    switch (capabilityId) {
      case "structureDocument":
        return this.structureDocument.execute(
          input as StructureDocumentInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      case "structureLinkedInProfile":
        return this.structureLinkedInProfile.execute(
          input as StructureLinkedInProfileInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      case "structureInstagramPost":
        return this.structureInstagramPost.execute(
          input as StructureInstagramPostInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      case "analyzePersona":
        return this.analyzePersona.execute(
          input as AnalyzePersonaInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      case "aggregatePerspectives":
        return this.aggregatePerspectives.execute(
          input as AggregatePerspectivesInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      case "rewriteContent":
        return this.rewriteContent.execute(
          input as RewriteContentInput,
        ) as Promise<CapabilityResult<CapabilityDataMap[K]>>;
      default:
        throw new Error(`Unknown capability: ${capabilityId}`);
    }
  }
}
