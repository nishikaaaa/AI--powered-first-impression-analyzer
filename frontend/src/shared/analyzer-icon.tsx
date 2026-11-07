import { Briefcase, Camera, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/analyzers";

const ICONS = {
  resume: FileText,
  linkedin_profile: Briefcase,
  instagram_post: Camera,
  linkedin: Briefcase,
  instagram: Camera,
};

export function AnalyzerIcon({
  type,
  className,
}: {
  type: ContentType | string;
  className?: string;
}) {
  const Icon = ICONS[type as keyof typeof ICONS] ?? FileText;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
