export type ReportSection = {
  id: string;
  label: string;
};

/** Sections every analyzer reuses. */
export const SHARED_REPORT_SECTIONS: ReportSection[] = [
  { id: "overallFirstImpression", label: "Overall first impression" },
  { id: "executiveSummary", label: "Executive summary" },
  { id: "consensus", label: "Consensus" },
  { id: "conflictingPerspectives", label: "Tension" },
  { id: "synthesis", label: "Synthesis" },
  { id: "personaLenses", label: "Persona lenses" },
];

export type ReportDefinition = {
  sharedSections: ReportSection[];
  extraSections: ReportSection[];
};

export function reportDefinition(extraSections: ReportSection[]): ReportDefinition {
  return {
    sharedSections: SHARED_REPORT_SECTIONS,
    extraSections,
  };
}
