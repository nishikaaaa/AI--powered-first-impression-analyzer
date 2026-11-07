import { z } from "zod";

export const linkedInBulletSchema = z.object({
  bulletId: z.string().min(1),
  text: z.string().min(1),
});

export const linkedInBlockSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().optional(),
  body: z.string().optional(),
  bullets: z.array(linkedInBulletSchema),
});

export const linkedInExperienceSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().optional(),
  dateRange: z.string().optional(),
  location: z.string().optional(),
  descriptionBullets: z.array(linkedInBulletSchema),
});

export const linkedInEducationSchema = z.object({
  sectionId: z.string().min(1),
  school: z.string().min(1),
  degree: z.string().optional(),
  dateRange: z.string().optional(),
  descriptionBullets: z.array(linkedInBulletSchema),
});

export const linkedInSkillSchema = z.object({
  skillId: z.string().min(1),
  name: z.string().min(1),
});

export const linkedInRecommendationSchema = z.object({
  sectionId: z.string().min(1),
  recommender: z.string().optional(),
  relationship: z.string().optional(),
  excerpt: z.string().min(1),
});

export const linkedInLanguageSchema = z.object({
  languageId: z.string().min(1),
  name: z.string().min(1),
});

export const structuredLinkedInProfileSchema = z.object({
  schemaVersion: z.literal("1.0"),
  identity: z.object({
    name: z.string().optional(),
    headline: z.string().optional(),
    location: z.string().optional(),
    industry: z.string().optional(),
    connectionCount: z.string().optional(),
    profileUrl: z.string().optional(),
  }),
  about: linkedInBlockSchema.optional(),
  experience: z.array(linkedInExperienceSchema),
  education: z.array(linkedInEducationSchema),
  skills: z.array(linkedInSkillSchema),
  certifications: z.array(linkedInBlockSchema),
  projects: z.array(linkedInBlockSchema),
  featured: z.array(linkedInBlockSchema),
  recommendations: z.array(linkedInRecommendationSchema),
  licenses: z.array(linkedInBlockSchema),
  volunteer: z.array(linkedInBlockSchema),
  publications: z.array(linkedInBlockSchema),
  honors: z.array(linkedInBlockSchema),
  languages: z.array(linkedInLanguageSchema),
});
