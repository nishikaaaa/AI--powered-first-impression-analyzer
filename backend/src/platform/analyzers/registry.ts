import type { ContentType } from "../../domain/content/content-type.js";
import type { ContentVersion } from "../../domain/resume/content.js";
import { instagramAnalyzer } from "./instagram.js";
import { linkedInAnalyzer } from "./linkedin.js";
import { resumeAnalyzer } from "./resume.js";
import type { ContentAnalyzerModule } from "./types.js";

const MODULES: ContentAnalyzerModule[] = [
  resumeAnalyzer,
  linkedInAnalyzer,
  instagramAnalyzer,
];

class ContentAnalyzerRegistry {
  private readonly byType = new Map<ContentType, ContentAnalyzerModule>(
    MODULES.map((m) => [m.contentType, m]),
  );

  list(): ContentAnalyzerModule[] {
    return [...MODULES];
  }

  get(contentType: ContentType): ContentAnalyzerModule {
    const mod = this.byType.get(contentType);
    if (!mod) throw new Error(`Unknown content analyzer: ${contentType}`);
    return mod;
  }

  findByStructuredVersion(version: ContentVersion): ContentAnalyzerModule | undefined {
    return MODULES.find((m) => m.extractStructured(version) != null);
  }
}

export const contentAnalyzerRegistry = new ContentAnalyzerRegistry();
export { resumeAnalyzer, linkedInAnalyzer, instagramAnalyzer };
export type { ContentAnalyzerModule } from "./types.js";
