"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { submitInstagramPost } from "@/lib/api";
import { upsertHistory } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/shared/page-header";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function InstagramComposer() {
  const router = useRouter();
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) {
      setError("Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    const room = MAX_IMAGES - previews.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_IMAGES} images per post.`);
      return;
    }
    const chosen = incoming.slice(0, room);
    const urls = await Promise.all(chosen.map(readAsDataUrl));
    setPreviews((prev) => [...prev, ...urls]);
    setError(
      incoming.length > room ? `Added ${chosen.length}. Maximum is ${MAX_IMAGES} slides.` : null,
    );
  }

  function removeAt(index: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!previews.length) {
      setError("Add at least one image to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { analysisId, contentId } = await submitInstagramPost({
        imageDataUrls: previews,
        caption,
        hashtags: parseHashtags(hashtags),
      });
      upsertHistory({
        analysisId,
        contentId,
        contentType: "instagram_post",
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
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Instagram"
        title="Show the post. We’ll read the first glance."
        description="Upload one photo or a carousel (up to 10). AI reads every slide, then rewrites caption, CTA, and hashtags — never the photos."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <label
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors duration-fast",
              previews.length ? "border-border bg-card" : "border-border bg-card hover:border-primary/50",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void addFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">
              {previews.length ? "Add more slides" : "Drop post images"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WebP, GIF · up to {MAX_IMAGES} · carousel order is upload order
            </p>
          </label>
          {previews.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((src, index) => (
                <li key={`${index}-${src.slice(-12)}`} className="relative overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Slide ${index + 1}`} className="aspect-square w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 text-white hover:bg-black"
                    onClick={() => removeAt(index)}
                    aria-label={`Remove slide ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="caption" className="text-sm font-medium">
              Caption
            </label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              placeholder="Write the caption you’d actually post."
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="hashtags" className="text-sm font-medium">
              Hashtags
            </label>
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#slowmorning #studio"
              className="mt-2"
            />
          </div>
          <Button type="submit" disabled={loading || !previews.length} className="w-full">
            {loading ? "Starting analysis…" : "Analyze post"}
          </Button>
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
