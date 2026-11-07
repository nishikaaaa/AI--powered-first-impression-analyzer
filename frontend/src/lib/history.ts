import type { ContentType } from "./analyzers";

const KEY = "fia.history.v1";

export type HistoryItem = {
  analysisId: string;
  contentId?: string;
  contentType: ContentType;
  createdAt: string;
  status: string;
  reportId?: string;
  firstImpression?: string;
};

function read(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: HistoryItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
}

export function listHistory(): HistoryItem[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertHistory(patch: Partial<HistoryItem> & { analysisId: string }) {
  const items = read();
  const idx = items.findIndex((i) => i.analysisId === patch.analysisId);
  if (idx >= 0) {
    items[idx] = { ...items[idx]!, ...patch };
  } else {
    items.unshift({
      contentType: "resume",
      createdAt: new Date().toISOString(),
      status: "queued",
      ...patch,
    });
  }
  write(items);
}

export function searchHistory(query: string): HistoryItem[] {
  const q = query.trim().toLowerCase();
  const items = listHistory();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.contentType.includes(q) ||
      i.firstImpression?.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      i.analysisId.toLowerCase().includes(q),
  );
}
