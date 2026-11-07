import { ReportView } from "@/features/report/report-view";
import { getContentVersion, getPersonaResults, getReport } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);
  const [personaResults, contentVersion] = await Promise.all([
    getPersonaResults(report.analysisRunId),
    getContentVersion(report.contentVersionId),
  ]);

  return (
    <ReportView
      reportId={id}
      report={report}
      personaResults={personaResults}
      contentVersion={contentVersion}
    />
  );
}
