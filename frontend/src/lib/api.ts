import type {
  AggregateReport,
  AnalysisRun,
  ContentVersionResponse,
  PersonaAnalysis,
  RewriteActionRequest,
  RewriteCatalog,
  RewriteResult,
  StructuredInstagramPost,
  StructuredLinkedInProfile,
  StructuredResume,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

const DEFAULT_USER = process.env.NEXT_PUBLIC_USER_ID ?? "dev-user";

function headers(): HeadersInit {
  return { "X-User-Id": DEFAULT_USER };
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      res.statusText;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function uploadResume(file: File): Promise<{
  analysisId: string;
  contentId: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/v1/impressions`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  return parseJson(res);
}

export async function submitInstagramPost(input: {
  imageDataUrl?: string;
  imageDataUrls?: string[];
  caption: string;
  hashtags: string[];
}): Promise<{
  analysisId: string;
  contentId: string;
}> {
  const images =
    input.imageDataUrls?.length
      ? input.imageDataUrls
      : input.imageDataUrl
        ? [input.imageDataUrl]
        : [];
  const res = await fetch(`${API_BASE}/v1/impressions/instagram`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      image: images[0],
      images,
      caption: input.caption,
      hashtags: input.hashtags,
    }),
  });
  return parseJson(res);
}

export async function submitLinkedInProfile(profileText: string): Promise<{
  analysisId: string;
  contentId: string;
}> {
  const res = await fetch(`${API_BASE}/v1/impressions/linkedin`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ profileText }),
  });
  return parseJson(res);
}

export function getAnalysis(id: string): Promise<AnalysisRun> {
  return fetch(`${API_BASE}/v1/analyses/${id}`, { headers: headers() }).then(
    (r) => parseJson<AnalysisRun>(r),
  );
}

export function getReport(id: string): Promise<AggregateReport> {
  return fetch(`${API_BASE}/v1/reports/${id}`, { headers: headers() }).then(
    (r) => parseJson<AggregateReport>(r),
  );
}

export function getContentVersion(id: string): Promise<ContentVersionResponse> {
  return fetch(`${API_BASE}/v1/content-versions/${id}`, {
    headers: headers(),
  }).then(async (r) => {
    const data = await parseJson<Record<string, unknown>>(r);
    if (data.contentType === "linkedin_profile") {
      return {
        ...(data as ContentVersionResponse),
        contentType: "linkedin_profile",
        structuredLinkedInProfile: data.structuredLinkedInProfile as StructuredLinkedInProfile,
      };
    }
    if (data.contentType === "instagram_post") {
      return {
        ...(data as ContentVersionResponse),
        contentType: "instagram_post",
        structuredInstagramPost: data.structuredInstagramPost as StructuredInstagramPost,
      };
    }
    return {
      contentVersionId: data.contentVersionId as string,
      contentId: data.contentId as string,
      contentType: "resume" as const,
      schemaVersion: data.schemaVersion as string,
      structureSpecId: data.structureSpecId as string | undefined,
      structureSpecVersion: data.structureSpecVersion as number | undefined,
      structuredResume: data.structuredResume as StructuredResume,
    };
  });
}

export function getPersonaResults(analysisId: string): Promise<PersonaAnalysis[]> {
  return fetch(`${API_BASE}/v1/analyses/${analysisId}/persona-results`, {
    headers: headers(),
  }).then((r) => parseJson<PersonaAnalysis[]>(r));
}

export function analysisEventsUrl(analysisId: string): string {
  return `${API_BASE}/v1/analyses/${analysisId}/events`;
}

export function getRewriteCatalog(): Promise<RewriteCatalog> {
  return fetch(`${API_BASE}/v1/rewrite-catalog`, { headers: headers() }).then(
    (r) => parseJson<RewriteCatalog>(r),
  );
}

export function requestRewrite(
  analysisId: string,
  req: RewriteActionRequest & { mode: string },
): Promise<RewriteResult> {
  return fetch(`${API_BASE}/v1/rewrites`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId, ...req }),
  }).then((r) => parseJson<RewriteResult>(r));
}

export { API_BASE };
