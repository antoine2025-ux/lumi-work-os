/**
 * Org QA Snapshot
 * 
 * Helper to build markdown snapshots of Org QA status for version control.
 */

import type {
  OrgQaQuestion,
  OrgQaSummaryByType,
} from "./org-qa-types";

export type OrgQaSnapshotPayload = {
  generatedAt: string; // ISO timestamp
  label?: string;
  questions: OrgQaQuestion[];
  summaryByType: OrgQaSummaryByType[];
};

export function buildOrgQaSnapshotMarkdown(
  payload: OrgQaSnapshotPayload
): string {
  const { generatedAt, label, questions, summaryByType } = payload;

  const date = new Date(generatedAt);
  const formattedDate = date.toISOString();

  const headerLines: string[] = [
    "# Org QA Snapshot",
    "",
    `Generated at: ${formattedDate}`,
  ];

  if (label) {
    headerLines.push(`Label: ${label}`, "");
  } else {
    headerLines.push("");
  }

  const summaryLines: string[] = [
    "## Summary by question type",
    "",
    "| Type | Label | Total | Pass | Partial | Fail |",
    "|------|-------|-------|------|---------|------|",
  ];

  for (const s of summaryByType) {
    summaryLines.push(
      `| ${s.type} | ${s.label} | ${s.total} | ${s.pass} | ${s.partial} | ${s.fail} |`
    );
  }

  const questionsLines: string[] = [
    "",
    "## Questions",
    "",
    "| ID | Label | Type | Status | Notes |",
    "|----|-------|------|--------|-------|",
  ];

  for (const q of questions) {
    questionsLines.push(
      `| ${q.id} | ${escapePipe(q.label)} | ${q.type} | ${q.status} | ${q.notes ? escapePipe(q.notes) : "-"} |`
    );
  }

  return [...headerLines, ...summaryLines, ...questionsLines, ""].join("\n");
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, "\\|");
}

