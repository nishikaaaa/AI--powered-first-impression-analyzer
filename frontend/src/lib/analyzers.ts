export type ContentType = "resume" | "linkedin_profile" | "instagram_post";

export type ReportSection = {
  id: string;
  label: string;
};

export const SHARED_REPORT_SECTIONS: ReportSection[] = [
  { id: "overallFirstImpression", label: "Overall first impression" },
  { id: "executiveSummary", label: "Executive summary" },
  { id: "consensus", label: "Consensus" },
  { id: "conflictingPerspectives", label: "Tension" },
  { id: "synthesis", label: "Synthesis" },
  { id: "personaLenses", label: "Persona lenses" },
];

export type FrontendAnalyzer = {
  contentType: ContentType;
  displayName: string;
  iconKey: string;
  shortLabel: string;
  upload: {
    kind: "pdf" | "paste" | "image_json";
    accept?: string;
    hint: string;
  };
  chooserHref?: string;
  chooserTitle: string;
  chooserBody: string;
  preparingMessage: string;
  failedMessage: string;
  retryHref: string;
  extraSections: ReportSection[];
  rewriteTargets: { id: string; label: string; actionLabel: string }[];
};

export const ANALYZERS: FrontendAnalyzer[] = [
  {
    contentType: "resume",
    displayName: "Resume",
    iconKey: "resume",
    shortLabel: "resume",
    upload: {
      kind: "pdf",
      accept: "application/pdf",
      hint: "Upload a text-based PDF",
    },
    chooserHref: "/resume",
    chooserTitle: "Upload a PDF",
    chooserBody:
      "Drop your resume and see how recruiters, managers, founders, and HR read it in the first 30 seconds.",
    preparingMessage: "Preparing your resume…",
    failedMessage: "Analysis could not complete. Try again with a text-based PDF.",
    retryHref: "/resume",
    extraSections: [{ id: "skills", label: "Skills" }],
    rewriteTargets: [
      { id: "summary", label: "Summary", actionLabel: "Rewrite Summary" },
      { id: "experience_bullet", label: "Experience bullet", actionLabel: "Improve Bullet" },
      { id: "project_description", label: "Project description", actionLabel: "Improve Project" },
      { id: "skills_description", label: "Skills", actionLabel: "Improve Skills" },
    ],
  },
  {
    contentType: "linkedin_profile",
    displayName: "LinkedIn profile",
    iconKey: "linkedin",
    shortLabel: "LinkedIn profile",
    upload: {
      kind: "paste",
      hint: "Paste profile text",
    },
    chooserHref: "/linkedin",
    chooserTitle: "Paste profile text",
    chooserBody:
      "Copy your LinkedIn profile sections and get the same multi-persona first-impression report with evidence links.",
    preparingMessage: "Preparing your LinkedIn profile…",
    failedMessage:
      "LinkedIn analysis could not complete. Check your pasted text and try again.",
    retryHref: "/linkedin",
    extraSections: [{ id: "experience", label: "Experience" }],
    rewriteTargets: [
      { id: "headline", label: "Headline", actionLabel: "Improve Headline" },
      { id: "about", label: "About", actionLabel: "Rewrite About" },
      { id: "experience", label: "Experience", actionLabel: "Improve Experience" },
      { id: "featured_description", label: "Featured", actionLabel: "Improve Featured" },
    ],
  },
  {
    contentType: "instagram_post",
    displayName: "Instagram post",
    iconKey: "instagram",
    shortLabel: "Instagram post",
    upload: {
      kind: "image_json",
      accept: "image/jpeg,image/png,image/webp,image/gif",
      hint: "Image, caption, and optional hashtags",
    },
    preparingMessage: "Preparing your Instagram post…",
    failedMessage:
      "Instagram analysis could not complete. Check the image and caption and try again.",
    retryHref: "/instagram",
    extraSections: [{ id: "visualReview", label: "Visual Review" }],
    chooserHref: "/instagram",
    chooserTitle: "Images, caption, and optional hashtags",
    chooserBody: "Analyze an Instagram post from one image or a carousel plus caption.",
    rewriteTargets: [
      { id: "caption", label: "Caption", actionLabel: "Improve Caption" },
      { id: "cta", label: "Call to action", actionLabel: "Improve CTA" },
      { id: "hashtags", label: "Hashtags", actionLabel: "Suggest Better Hashtags" },
    ],
  },
];

export const REWRITE_MODES = [
  { id: "professional", label: "Professional" },
  { id: "concise", label: "Concise" },
  { id: "executive", label: "Executive" },
  { id: "more_engaging", label: "More Engaging" },
  { id: "more_technical", label: "Technical" },
  { id: "personal_brand", label: "Personal Brand" },
];

export const PERSONA_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  engineering_manager: "Engineering Manager",
  founder: "Founder",
  hr: "HR",
  new_viewer: "New Viewer",
  existing_follower: "Existing Follower",
  brand_strategist: "Brand Strategist",
  content_creator: "Content Creator",
};

const BY_TYPE = new Map(ANALYZERS.map((a) => [a.contentType, a]));

export function getAnalyzer(contentType: string | undefined): FrontendAnalyzer {
  return BY_TYPE.get((contentType as ContentType) ?? "resume") ?? ANALYZERS[0]!;
}

export function chooserAnalyzers(): FrontendAnalyzer[] {
  return ANALYZERS.filter((a) => a.chooserHref);
}
