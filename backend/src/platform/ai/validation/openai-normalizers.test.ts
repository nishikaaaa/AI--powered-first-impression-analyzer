import assert from "node:assert/strict";
import {
  normalizeAggregateFromLlm,
  normalizePersonaAnalysisFromLlm,
  normalizeRewriteFromLlm,
  normalizeStructuredInstagramFromLlm,
  normalizeStructuredLinkedInFromLlm,
  normalizeStructuredResumeFromLlm,
} from "./openai-normalizers.js";
import {
  validatePersonaAnalysisInstagram,
  validateRewriteOutput,
  validateStructuredInstagram,
  validateStructuredLinkedIn,
} from "./validateOutput.js";

function run() {
  const resume = normalizeStructuredResumeFromLlm({
    schemaVersion: "1.0",
    identity: { name: "A", headline: "", email: "", phone: "", location: "" },
    sections: [
      {
        sectionId: "s1",
        type: "summary",
        title: "",
        bullets: [{ bulletId: "b1", text: "Hello" }],
      },
    ],
  }) as { identity: Record<string, string> };
  assert.equal(resume.identity.name, "A");
  assert.equal(resume.identity.headline, undefined);

  const persona = normalizePersonaAnalysisFromLlm({
    firstImpression: "x",
    firstImpressionEvidence: [],
    snapshotSeconds: "y",
    lensSummary: "z",
    claims: [
      {
        claimId: "c1",
        kind: "strength",
        statement: "s",
        evidence: [
          { sectionId: "s1", bulletId: "b1", fieldPath: "", excerpt: "ex" },
        ],
        confidence: {
          aiConfidence: "high",
          aiConfidenceReason: "r",
          evidenceStrength: "strong",
          informationCompleteness: "sufficient",
          missingInformation: [],
        },
      },
    ],
  }) as { claims: { evidence: { fieldPath?: string }[] }[] };
  assert.equal(persona.claims[0]!.evidence[0]!.fieldPath, undefined);

  const agg = normalizeAggregateFromLlm({
    executiveSummary: "e",
    overallFirstImpression: "o",
    consensusThemes: [],
    conflictingPerspectives: [],
    personaHeadlineEntries: [{ personaId: "recruiter", headline: "h" }],
    synthesisClaims: [],
  }) as { personaHeadlines: Record<string, string> };
  assert.equal(agg.personaHeadlines.recruiter, "h");

  const linkedIn = normalizeStructuredLinkedInFromLlm({
    schemaVersion: "1.0",
    identity: {
      name: "Alex",
      headline: "Engineer",
      location: "",
      industry: "",
      connectionCount: "",
      profileUrl: "",
    },
    about: {
      sectionId: "about_main",
      title: "",
      body: "About text here.",
      bullets: [],
    },
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    featured: [],
    recommendations: [],
    licenses: [],
    volunteer: [],
    publications: [],
    honors: [],
    languages: [],
  });
  const linkedInValid = validateStructuredLinkedIn(linkedIn);
  assert.equal(linkedInValid.valid, true);

  const instagram = normalizeStructuredInstagramFromLlm({
    schemaVersion: "1.0",
    mediaItems: [
      {
        mediaType: "image",
        mimeType: "image/jpeg",
        orientation: "unknown",
        aspectHint: "",
        visualStyle: "  product photograph  ",
        regions: [
          {
            kind: "product",
            label: "Mug",
            description: "White mug in the center.",
            vertical: "center",
            horizontal: "center",
          },
          {
            kind: "text_overlay",
            label: "Packaging type",
            description: "Small type on the mug.",
            vertical: "bottom",
            horizontal: "center",
          },
        ],
      },
    ],
    composition: {
      layout: "",
      lighting: "daylight",
      colorPalette: ["#ffffff", "  ", "#c47b4a"],
      focalPointRegionIndex: "0",
    },
    branding: {
      brandName: "",
      logoVisible: "no",
      brandCues: "  ",
      logoRegionIndex: "",
    },
    detectedText: [
      { text: "HANDMADE", regionIndex: "1", confidence: 0.91 },
      { text: "", regionIndex: "0", confidence: 0.2 },
      { text: "ghost", regionIndex: "9", confidence: 0.9 },
    ],
    hashtags: [{ tag: "#SlowMorning" }, { tag: "  " }],
  }) as {
    mediaItems: {
      mediaItemId: string;
      orientation?: string;
      visualStyle?: string;
      regions: { imageRegionId: string }[];
    }[];
    branding: { logoVisible?: boolean; brandName?: string; logoRegionId?: string };
    composition: { layout?: string; colorPalette: string[]; focalPointRegionId?: string };
    detectedText: { detectedTextId: string; imageRegionId: string; confidence: number }[];
    hashtags: { hashtagId: string; tag: string }[];
    caption: { sections: unknown[] };
  };
  assert.equal(instagram.mediaItems[0]!.mediaItemId, "media_0");
  assert.equal(instagram.mediaItems[0]!.orientation, undefined);
  assert.equal(instagram.mediaItems[0]!.visualStyle, "product photograph");
  assert.equal(instagram.mediaItems[0]!.regions[0]!.imageRegionId, "media_0_region_0");
  assert.equal(instagram.branding.logoVisible, false);
  assert.equal(instagram.branding.brandName, undefined);
  assert.equal(instagram.branding.logoRegionId, undefined);
  assert.equal(instagram.composition.layout, undefined);
  assert.equal(instagram.composition.focalPointRegionId, "media_0_region_0");
  assert.deepEqual(instagram.composition.colorPalette, ["#ffffff", "#c47b4a"]);
  assert.equal(instagram.hashtags.length, 1);
  assert.equal(instagram.hashtags[0]!.tag, "SlowMorning");
  assert.equal(instagram.detectedText.length, 1);
  assert.equal(instagram.detectedText[0]!.detectedTextId, "detected_text_0");
  assert.equal(instagram.detectedText[0]!.imageRegionId, "media_0_region_1");
  assert.equal(instagram.detectedText[0]!.confidence, 0.91);
  assert.equal(instagram.caption.sections.length, 0);

  const instagramNeedsCaption = {
    ...instagram,
    caption: {
      original: "Slow mornings and a warm mug. #SlowMorning",
      normalized: "Slow mornings and a warm mug. #SlowMorning",
      sections: [
        {
          sectionId: "caption_main",
          kind: "full" as const,
          text: "Slow mornings and a warm mug. #SlowMorning",
        },
      ],
    },
  };
  const instagramValid = validateStructuredInstagram(instagramNeedsCaption);
  assert.equal(instagramValid.valid, true);

  const personaOk = validatePersonaAnalysisInstagram(
    {
      analysisRunId: "a",
      personaId: "new_viewer",
      personaDisplayName: "New Viewer",
      firstImpression: "Clear product photo.",
      firstImpressionEvidence: [
        {
          sectionId: "media_0_region_0",
          bulletId: "",
          fieldPath: "",
          excerpt: "White mug in the center.",
        },
      ],
      snapshotSeconds: "Looked at the mug region and caption.",
      lensSummary: "First-time viewer scan.",
      claims: [
        {
          claimId: "c1",
          kind: "strength",
          statement: "The product is immediately visible.",
          evidence: [
            {
              sectionId: "media_0_region_1",
              bulletId: "detected_text_0",
              fieldPath: "",
              excerpt: "HANDMADE",
            },
            {
              sectionId: "caption_main",
              bulletId: "",
              fieldPath: "",
              excerpt: "Slow mornings",
            },
          ],
          confidence: {
            aiConfidence: "high",
            aiConfidenceReason: "Region and caption are present.",
            evidenceStrength: "strong",
            informationCompleteness: "partial",
            missingInformation: [],
          },
        },
      ],
    },
    instagramNeedsCaption as never,
  );
  assert.equal(personaOk.valid, true);

  const personaBad = validatePersonaAnalysisInstagram(
    {
      analysisRunId: "a",
      personaId: "new_viewer",
      personaDisplayName: "New Viewer",
      firstImpression: "x",
      snapshotSeconds: "y",
      lensSummary: "z",
      claims: [
        {
          claimId: "c1",
          kind: "strength",
          statement: "Missing region.",
          evidence: [{ sectionId: "media_9_region_9", excerpt: "nope" }],
          confidence: {
            aiConfidence: "low",
            aiConfidenceReason: "r",
            evidenceStrength: "weak",
            informationCompleteness: "sparse",
          },
        },
      ],
    },
    instagramNeedsCaption as never,
  );
  assert.equal(personaBad.valid, false);

  const badRegion = validateStructuredInstagram({
    ...instagramNeedsCaption,
    detectedText: [
      {
        detectedTextId: "detected_text_0",
        text: "Nope",
        imageRegionId: "media_9_region_9",
        confidence: 0.4,
      },
    ],
  });
  assert.equal(badRegion.valid, false);

  const rewriteNorm = normalizeRewriteFromLlm({
    rewrittenText: "  Built APIs serving 1M requests/day.  ",
    explanation: "  Kept the metric already in the bullet.  ",
    warnings: [""],
    missingInformation: [" team size "],
  }) as { rewrittenText: string; missingInformation: string[] };
  assert.equal(rewriteNorm.rewrittenText, "Built APIs serving 1M requests/day.");
  assert.equal(rewriteNorm.missingInformation[0], "team size");

  const rewriteOk = validateRewriteOutput(
    rewriteNorm,
    "Built APIs serving 1M requests/day.",
    { sections: [] },
  );
  assert.equal(rewriteOk.valid, true);

  const rewriteWarn = validateRewriteOutput(
    {
      rewrittenText: "Grew revenue 40% in two quarters.",
      explanation: "Made it punchier.",
      warnings: [],
      missingInformation: [],
    },
    "Worked on the billing service.",
    {},
  );
  assert.equal(rewriteWarn.valid, true);
  const warnData = rewriteWarn.data as { warnings: string[] };
  assert.ok(warnData.warnings.some((w) => w.includes("40%")));

  console.log("openai-normalizers: ok");
}

run();
