"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { submitLinkedInProfile } from "@/lib/api";
import { upsertHistory } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/shared/page-header";

const MIN_CHARS = 50;
const PLACEHOLDER = `Alex Chen
Senior Software Engineer · San Francisco Bay Area

About
Backend engineer focused on distributed systems and developer experience.

Experience
Example Co — Senior Software Engineer
Jan 2021 – Present
• Led API platform serving 2M daily users.`;

export function LinkedInEditor() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const tooShort = charCount > 0 && charCount < MIN_CHARS;
  const canSubmit = charCount >= MIN_CHARS && !loading;

  const hint = useMemo(() => {
    if (charCount === 0) return "Paste headline, About, Experience, Education, and Skills.";
    if (tooShort) return `${MIN_CHARS - charCount} more characters to analyze.`;
    return "Looks long enough to structure.";
  }, [charCount, tooShort]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const { analysisId, contentId } = await submitLinkedInProfile(trimmed);
      upsertHistory({
        analysisId,
        contentId,
        contentType: "linkedin_profile",
        status: "queued",
      });
      router.push(`/analysis/${analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="LinkedIn"
        title="Paste the profile. We’ll read it like a hiring team."
        description="Copy visible sections from LinkedIn while signed in. We don’t scrape URLs or open a profile link."
      />
      <ol className="list-decimal space-y-2 rounded-2xl border border-border bg-card px-5 py-4 pl-9 text-sm leading-relaxed text-muted-foreground">
        <li>
          Open your LinkedIn profile in the browser while you are signed in (your own, or a profile you can see).
        </li>
        <li>
          Select and copy the text as it appears: headline, About, Experience (role, company, dates, bullets), Education, and Skills.
        </li>
        <li>
          Paste that text below. A URL is not enough — the analyzer only reads what you paste.
        </li>
        <li>
          Need a sample? Open <span className="font-mono text-xs text-foreground">fixtures/test/linkedin-jordan-lee.txt</span> and paste it.
        </li>
      </ol>
      <label htmlFor="profileText" className="sr-only">
        LinkedIn profile text
      </label>
      <Textarea
        id="profileText"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={18}
        disabled={loading}
        aria-describedby="linkedin-hint"
        className="min-h-[420px] font-mono text-[13px]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="linkedin-hint" className="text-xs text-muted-foreground">
          {charCount} characters · {hint}
        </p>
        <Button type="submit" disabled={!canSubmit}>
          {loading ? "Starting analysis…" : "Analyze profile"}
        </Button>
      </div>
      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
