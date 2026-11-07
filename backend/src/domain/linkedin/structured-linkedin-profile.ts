export type LinkedInBullet = {
  bulletId: string;
  text: string;
};

export type LinkedInBlock = {
  sectionId: string;
  title?: string;
  body?: string;
  bullets: LinkedInBullet[];
};

export type LinkedInExperienceItem = {
  sectionId: string;
  title: string;
  company?: string;
  dateRange?: string;
  location?: string;
  descriptionBullets: LinkedInBullet[];
};

export type LinkedInEducationItem = {
  sectionId: string;
  school: string;
  degree?: string;
  dateRange?: string;
  descriptionBullets: LinkedInBullet[];
};

export type LinkedInSkill = {
  skillId: string;
  name: string;
};

export type LinkedInRecommendation = {
  sectionId: string;
  recommender?: string;
  relationship?: string;
  excerpt: string;
};

export type LinkedInLanguage = {
  languageId: string;
  name: string;
};

export type StructuredLinkedInProfile = {
  schemaVersion: "1.0";
  identity: {
    name?: string;
    headline?: string;
    location?: string;
    industry?: string;
    connectionCount?: string;
    profileUrl?: string;
  };
  about?: LinkedInBlock;
  experience: LinkedInExperienceItem[];
  education: LinkedInEducationItem[];
  skills: LinkedInSkill[];
  certifications: LinkedInBlock[];
  projects: LinkedInBlock[];
  featured: LinkedInBlock[];
  recommendations: LinkedInRecommendation[];
  licenses: LinkedInBlock[];
  volunteer: LinkedInBlock[];
  publications: LinkedInBlock[];
  honors: LinkedInBlock[];
  languages: LinkedInLanguage[];
};
