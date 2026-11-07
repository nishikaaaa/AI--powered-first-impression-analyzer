export const REWRITE_MODE_CATALOG = [
  {
    id: "professional",
    label: "Professional",
    instruction:
      "Use clear, professional language appropriate for hiring and brand contexts. Keep facts unchanged.",
  },
  {
    id: "concise",
    label: "Concise",
    instruction: "Tighten wording and remove filler. Do not drop concrete facts.",
  },
  {
    id: "more_engaging",
    label: "More Engaging",
    instruction:
      "Make the writing more vivid and specific using only details already present. Do not invent color or results.",
  },
  {
    id: "more_technical",
    label: "More Technical",
    instruction:
      "Favor precise technical wording for skills and systems already mentioned. Do not add technologies that are not present.",
  },
  {
    id: "beginner_friendly",
    label: "Beginner Friendly",
    instruction:
      "Use plainer language while keeping the same facts. Do not oversimplify by dropping specifics.",
  },
  {
    id: "executive",
    label: "Executive",
    instruction:
      "Lead with outcome and scope using only facts in the original. Do not invent business impact.",
  },
  {
    id: "personal_brand",
    label: "Personal Brand",
    instruction:
      "Strengthen voice and positioning using only the author's existing details. Do not fabricate a personal story.",
  },
] as const;

export type RewriteMode = (typeof REWRITE_MODE_CATALOG)[number]["id"];

export const ALL_REWRITE_MODES: RewriteMode[] = REWRITE_MODE_CATALOG.map((m) => m.id);

export function rewriteModeById(id: string) {
  return REWRITE_MODE_CATALOG.find((m) => m.id === id);
}

export type RewriteTargetId =
  | "summary"
  | "experience_bullet"
  | "project_description"
  | "skills_description"
  | "headline"
  | "about"
  | "experience"
  | "featured_description"
  | "caption"
  | "cta"
  | "hashtags";

export type RewriteTarget = {
  id: RewriteTargetId;
  label: string;
  actionLabel: string;
};

export const RESUME_REWRITE_TARGETS: RewriteTarget[] = [
  { id: "summary", label: "Summary", actionLabel: "Rewrite Summary" },
  { id: "experience_bullet", label: "Experience bullet", actionLabel: "Improve Bullet" },
  { id: "project_description", label: "Project description", actionLabel: "Improve Project" },
  { id: "skills_description", label: "Skills", actionLabel: "Improve Skills" },
];

export const LINKEDIN_REWRITE_TARGETS: RewriteTarget[] = [
  { id: "headline", label: "Headline", actionLabel: "Improve Headline" },
  { id: "about", label: "About", actionLabel: "Rewrite About" },
  { id: "experience", label: "Experience", actionLabel: "Improve Experience" },
  { id: "featured_description", label: "Featured", actionLabel: "Improve Featured" },
];

export const INSTAGRAM_REWRITE_TARGETS: RewriteTarget[] = [
  { id: "caption", label: "Caption", actionLabel: "Improve Caption" },
  { id: "cta", label: "Call to action", actionLabel: "Improve CTA" },
  { id: "hashtags", label: "Hashtags", actionLabel: "Suggest Better Hashtags" },
];

export type RewriteSource = {
  originalText: string;
  targetId: RewriteTargetId;
  sectionId?: string;
  bulletId?: string;
  warnings: string[];
};

export type RewriteResolveInput = {
  targetId: RewriteTargetId;
  structured: unknown;
  sectionId?: string;
  bulletId?: string;
  originalText?: string;
};

export type RewriteResolveResult =
  | { ok: true; source: RewriteSource }
  | { ok: false; error: string };

export type RewriteResult = {
  originalText: string;
  rewrittenText: string;
  explanation: string;
  warnings: string[];
  mode: RewriteMode;
  targetId: RewriteTargetId;
  contentType: string;
  sectionId?: string;
  bulletId?: string;
};

export type RewriteSupport = {
  enabled: boolean;
  targets: readonly RewriteTarget[];
  modes: readonly RewriteMode[];
  resolve(input: RewriteResolveInput): RewriteResolveResult;
  inferTarget(input: {
    structured: unknown;
    sectionId?: string;
    bulletId?: string;
  }): RewriteTargetId | undefined;
};
