import type { OrgQaQuestionWithStatus } from "./types";

export const ORG_QA_QUESTIONS = [
  {
    id: "org-has-any-departments",
    label: "Org has at least one department",
    description: "Checks if the workspace has OrgDepartments.",
    type: "org_structure",
  },
  {
    id: "org-has-any-teams",
    label: "Org has at least one team",
    description: "Checks if the workspace has OrgTeams linked to departments.",
    type: "org_structure",
  },
  {
    id: "org-has-any-positions",
    label: "Org has at least one position",
    description: "Checks if OrgPosition records exist.",
    type: "org_structure",
  },
  {
    id: "org-has-any-members",
    label: "Workspace has at least one member",
    description: "Checks if WorkspaceMember exists.",
    type: "people",
  },
  {
    id: "org-has-basic-reporting-lines",
    label: "Org has basic reporting lines defined",
    description: "Checks if OrgPosition entries form a hierarchy.",
    type: "hierarchy",
  },
];

export function getStubbedOrgQaQuestions(): OrgQaQuestionWithStatus[] {
  const now = new Date().toISOString();
  return ORG_QA_QUESTIONS.map((q) => ({
    ...q,
    status: "stub" as const,
    lastUpdated: now,
  }));
}

