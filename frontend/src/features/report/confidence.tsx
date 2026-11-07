import type { ConfidenceAssessment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function confidenceVariant(level: string) {
  if (level === "high" || level === "strong" || level === "sufficient") return "success" as const;
  if (level === "low" || level === "weak" || level === "sparse") return "rose" as const;
  return "warning" as const;
}

export function ConfidencePanel({ c }: { c: ConfidenceAssessment }) {
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-muted/70 p-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-2">
        <Badge variant={confidenceVariant(c.aiConfidence)}>Confidence {c.aiConfidence}</Badge>
        <Badge variant={confidenceVariant(c.evidenceStrength)}>Evidence {c.evidenceStrength}</Badge>
        <Badge variant={confidenceVariant(c.informationCompleteness)}>
          {c.informationCompleteness}
        </Badge>
      </div>
      <p>{c.aiConfidenceReason}</p>
      {c.missingInformation && c.missingInformation.length > 0 && (
        <p>Missing: {c.missingInformation.join(" · ")}</p>
      )}
    </div>
  );
}
