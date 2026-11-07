export type StructuredBullet = {
  bulletId: string;
  text: string;
  sourceSpan?: { charStart: number; charEnd: number };
};

export type StructuredSection = {
  sectionId: string;
  type:
    | "summary"
    | "experience"
    | "education"
    | "skills"
    | "projects"
    | "certifications"
    | "other";
  title?: string;
  bullets: StructuredBullet[];
  fields?: Record<string, string>;
};

export type StructuredResume = {
  schemaVersion: "1.0";
  identity: {
    name?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  sections: StructuredSection[];
};
