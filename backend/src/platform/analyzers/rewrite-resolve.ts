import type { StructuredInstagramPost } from "../../domain/instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../../domain/linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "../../domain/resume/structured-resume.js";
import type {
  RewriteResolveInput,
  RewriteResolveResult,
  RewriteTargetId,
} from "../../domain/rewrite/rewrite-config.js";

function joinLines(parts: Array<string | undefined>): string {
  return parts.map((p) => p?.trim() ?? "").filter(Boolean).join("\n");
}

function useClientOriginal(
  resolved: string,
  originalText: string | undefined,
): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  const client = originalText?.trim();
  if (!client) return { text: resolved, warnings };
  if (client === resolved) return { text: resolved, warnings };
  if (resolved.includes(client) || client.includes(resolved)) {
    return { text: client.length <= resolved.length ? client : resolved, warnings };
  }
  warnings.push("Selected text was not an exact match for the structured field; rewriting the selected excerpt.");
  return { text: client, warnings };
}

export function inferResumeTarget(input: {
  structured: unknown;
  sectionId?: string;
  bulletId?: string;
}): RewriteTargetId | undefined {
  const resume = input.structured as StructuredResume | undefined;
  if (!resume?.sections) return undefined;
  const section = resume.sections.find((s) => s.sectionId === input.sectionId);
  if (!section) return input.bulletId ? "experience_bullet" : "summary";
  if (section.type === "summary") return "summary";
  if (section.type === "skills") return "skills_description";
  if (section.type === "projects") return "project_description";
  if (input.bulletId || section.type === "experience") return "experience_bullet";
  return "summary";
}

export function resolveResumeRewrite(input: RewriteResolveInput): RewriteResolveResult {
  const resume = input.structured as StructuredResume | undefined;
  if (!resume?.sections) return { ok: false, error: "Structured resume missing" };

  if (input.targetId === "summary") {
    const section =
      resume.sections.find((s) => s.sectionId === input.sectionId && s.type === "summary") ??
      resume.sections.find((s) => s.type === "summary");
    if (!section) return { ok: false, error: "Summary section not found" };
    const resolved = joinLines(section.bullets.map((b) => b.text));
    if (!resolved) return { ok: false, error: "Summary is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: { originalText: text, targetId: "summary", sectionId: section.sectionId, warnings },
    };
  }

  if (input.targetId === "skills_description") {
    const section =
      resume.sections.find((s) => s.sectionId === input.sectionId && s.type === "skills") ??
      resume.sections.find((s) => s.type === "skills");
    if (!section) return { ok: false, error: "Skills section not found" };
    const resolved = joinLines(section.bullets.map((b) => b.text));
    if (!resolved) return { ok: false, error: "Skills section is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: {
        originalText: text,
        targetId: "skills_description",
        sectionId: section.sectionId,
        warnings,
      },
    };
  }

  if (input.targetId === "project_description") {
    const section =
      resume.sections.find((s) => s.sectionId === input.sectionId && s.type === "projects") ??
      resume.sections.find((s) => s.type === "projects");
    if (!section) return { ok: false, error: "Project section not found" };
    const bullet = input.bulletId
      ? section.bullets.find((b) => b.bulletId === input.bulletId)
      : undefined;
    const resolved = bullet ? bullet.text : joinLines(section.bullets.map((b) => b.text));
    if (!resolved) return { ok: false, error: "Project description is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: {
        originalText: text,
        targetId: "project_description",
        sectionId: section.sectionId,
        bulletId: bullet?.bulletId,
        warnings,
      },
    };
  }

  if (input.targetId === "experience_bullet") {
    const section = input.sectionId
      ? resume.sections.find((s) => s.sectionId === input.sectionId)
      : resume.sections.find((s) => s.type === "experience");
    if (!section) return { ok: false, error: "Experience section not found" };
    const bullet = input.bulletId
      ? section.bullets.find((b) => b.bulletId === input.bulletId)
      : section.bullets[0];
    if (!bullet?.text) return { ok: false, error: "Experience bullet not found" };
    const { text, warnings } = useClientOriginal(bullet.text, input.originalText);
    return {
      ok: true,
      source: {
        originalText: text,
        targetId: "experience_bullet",
        sectionId: section.sectionId,
        bulletId: bullet.bulletId,
        warnings,
      },
    };
  }

  return { ok: false, error: `Unsupported resume rewrite target: ${input.targetId}` };
}

export function inferLinkedInTarget(input: {
  structured: unknown;
  sectionId?: string;
  bulletId?: string;
}): RewriteTargetId | undefined {
  const profile = input.structured as StructuredLinkedInProfile | undefined;
  const sectionId = input.sectionId ?? "";
  if (sectionId === "headline" || sectionId === "identity" || sectionId === "identity.headline") {
    return "headline";
  }
  if (!profile) return undefined;
  if (profile.about && (sectionId === profile.about.sectionId || sectionId.startsWith("about"))) {
    return "about";
  }
  if (profile.featured.some((b) => b.sectionId === sectionId)) return "featured_description";
  if (profile.experience.some((e) => e.sectionId === sectionId)) return "experience";
  if (sectionId.startsWith("exp")) return "experience";
  return "about";
}

export function resolveLinkedInRewrite(input: RewriteResolveInput): RewriteResolveResult {
  const profile = input.structured as StructuredLinkedInProfile | undefined;
  if (!profile) return { ok: false, error: "Structured LinkedIn profile missing" };

  if (input.targetId === "headline") {
    const resolved = profile.identity.headline?.trim() ?? "";
    if (!resolved) return { ok: false, error: "Headline is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: { originalText: text, targetId: "headline", sectionId: "headline", warnings },
    };
  }

  if (input.targetId === "about") {
    const about = profile.about;
    if (!about) return { ok: false, error: "About section not found" };
    const resolved = joinLines([about.body, ...about.bullets.map((b) => b.text)]);
    if (!resolved) return { ok: false, error: "About section is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: { originalText: text, targetId: "about", sectionId: about.sectionId, warnings },
    };
  }

  if (input.targetId === "experience") {
    const item = input.sectionId
      ? profile.experience.find((e) => e.sectionId === input.sectionId)
      : profile.experience[0];
    if (!item) return { ok: false, error: "Experience item not found" };
    const bullet = input.bulletId
      ? item.descriptionBullets.find((b) => b.bulletId === input.bulletId)
      : undefined;
    const resolved = bullet
      ? bullet.text
      : joinLines([
          [item.title, item.company].filter(Boolean).join(" · "),
          ...item.descriptionBullets.map((b) => b.text),
        ]);
    if (!resolved) return { ok: false, error: "Experience text is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: {
        originalText: text,
        targetId: "experience",
        sectionId: item.sectionId,
        bulletId: bullet?.bulletId,
        warnings,
      },
    };
  }

  if (input.targetId === "featured_description") {
    const block = input.sectionId
      ? profile.featured.find((b) => b.sectionId === input.sectionId)
      : profile.featured[0];
    if (!block) return { ok: false, error: "Featured item not found" };
    const resolved = joinLines([block.title, block.body, ...block.bullets.map((b) => b.text)]);
    if (!resolved) return { ok: false, error: "Featured description is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: {
        originalText: text,
        targetId: "featured_description",
        sectionId: block.sectionId,
        warnings,
      },
    };
  }

  return { ok: false, error: `Unsupported LinkedIn rewrite target: ${input.targetId}` };
}

function lastCaptionLine(caption: string): string {
  const lines = caption.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? caption.trim();
}

export function inferInstagramTarget(input: {
  structured: unknown;
  sectionId?: string;
  bulletId?: string;
}): RewriteTargetId | undefined {
  const sectionId = input.sectionId ?? "";
  if (sectionId.startsWith("hashtag")) return "hashtags";
  if (sectionId.includes("cta")) return "cta";
  if (sectionId.startsWith("caption")) return "caption";
  return "caption";
}

export function resolveInstagramRewrite(input: RewriteResolveInput): RewriteResolveResult {
  const post = input.structured as StructuredInstagramPost | undefined;
  if (!post) return { ok: false, error: "Structured Instagram post missing" };

  if (input.targetId === "caption") {
    const resolved = post.caption?.original?.trim() ?? "";
    if (!resolved) return { ok: false, error: "Caption is empty" };
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: { originalText: text, targetId: "caption", sectionId: "caption_main", warnings },
    };
  }

  if (input.targetId === "cta") {
    const caption = post.caption?.original?.trim() ?? "";
    if (!caption) return { ok: false, error: "Caption is empty; cannot rewrite CTA" };
    const resolved = lastCaptionLine(caption);
    const warnings: string[] = [];
    if (resolved === caption) {
      warnings.push(
        "No separate CTA line was found; the rewrite will propose a call to action from the caption without inventing offers.",
      );
    }
    const used = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: {
        originalText: used.text,
        targetId: "cta",
        sectionId: "caption_main",
        warnings: [...warnings, ...used.warnings],
      },
    };
  }

  if (input.targetId === "hashtags") {
    const tags = (post.hashtags ?? []).map((h) => (h.tag.startsWith("#") ? h.tag : `#${h.tag}`));
    const resolved = tags.join(" ");
    if (!resolved) {
      return {
        ok: true,
        source: {
          originalText: input.originalText?.trim() || "",
          targetId: "hashtags",
          warnings: [
            "No hashtags were extracted. Suggestions will stay generic and will not invent brand names.",
          ],
        },
      };
    }
    const { text, warnings } = useClientOriginal(resolved, input.originalText);
    return {
      ok: true,
      source: { originalText: text, targetId: "hashtags", warnings },
    };
  }

  return { ok: false, error: `Unsupported Instagram rewrite target: ${input.targetId}` };
}
