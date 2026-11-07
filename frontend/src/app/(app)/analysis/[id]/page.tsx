import { AnalysisProgress } from "@/features/progress/analysis-progress";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalysisProgress analysisId={id} />;
}
