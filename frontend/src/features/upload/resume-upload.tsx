"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { uploadResume } from "@/lib/api";
import { upsertHistory } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/shared/page-header";

export function ResumeUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  const submit = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Upload a text-based PDF.");
        return;
      }
      setError(null);
      setName(file.name);
      setLoading(true);
      try {
        const { analysisId, contentId } = await uploadResume(file);
        upsertHistory({
          analysisId,
          contentId,
          contentType: "resume",
          status: "queued",
        });
        router.push(`/analysis/${analysisId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Resume"
        title="Drop the PDF. We’ll read the first 30 seconds."
        description="Text-based PDFs work best. We extract structure, run four hiring lenses, and link every insight back to a line."
      />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void submit(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-8 py-16 transition-colors duration-fast",
          dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
          loading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void submit(file);
          }}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          {name ? <FileText className="h-5 w-5" aria-hidden /> : <Upload className="h-5 w-5" aria-hidden />}
        </span>
        <p className="mt-4 font-medium">{name ?? "Drop your resume PDF"}</p>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse · max 10 MB</p>
        {loading && <p className="mt-4 text-sm text-primary">Starting analysis…</p>}
      </label>
      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">
          {error}
        </p>
      )}
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        Choose file
      </Button>
    </div>
  );
}
