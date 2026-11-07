import type { EvidenceReference } from "./types";

export function evidenceKey(ref: EvidenceReference): string {
  return `${ref.sectionId}::${ref.bulletId ?? ""}::${ref.fieldPath ?? ""}`;
}

export function refsMatch(
  a: EvidenceReference,
  b: EvidenceReference,
): boolean {
  return (
    a.sectionId === b.sectionId &&
    (a.bulletId ?? "") === (b.bulletId ?? "") &&
    (a.fieldPath ?? "") === (b.fieldPath ?? "")
  );
}

export function overlayKey(sectionId: string, bulletId?: string): string {
  return `${sectionId}::${bulletId ?? ""}`;
}

export function isRefHighlighted(
  sectionId: string,
  bulletId: string | undefined,
  active: EvidenceReference[],
): boolean {
  return active.some(
    (r) =>
      r.sectionId === sectionId &&
      (r.bulletId === undefined || r.bulletId === bulletId),
  );
}
