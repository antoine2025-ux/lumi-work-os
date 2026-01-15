export type OrgSmokeTestStatus = "unknown" | "ok" | "warning" | "fail";

export type OrgLoopbrainSmokeTest = {
  id: string;
  question: string;
  intent: string;
  expectedShape: string;
};

export const ORG_LOOPBRAIN_SMOKE_TESTS: OrgLoopbrainSmokeTest[] = [
  {
    id: "org-reporting-1",
    question: "Who leads the Platform team?",
    intent: "Identify the manager/lead of a specific team.",
    expectedShape:
      "Answer should name a single person who is the manager/lead of the Platform team, ideally with role title.",
  },
  {
    id: "org-structure-1",
    question: "Which teams are part of the Engineering department?",
    intent: "List teams under a department.",
    expectedShape:
      "Answer should list all teams that belong to the Engineering department by name.",
  },
  {
    id: "org-reporting-2",
    question: "Who reports to the Head of Engineering?",
    intent: "List direct reports of a specific manager/role.",
    expectedShape:
      "Answer should list direct reports (people) reporting to the Head of Engineering.",
  },
  {
    id: "org-team-membership-1",
    question: "Which people are in the AI & Loopbrain Team?",
    intent: "List members of a specific team.",
    expectedShape:
      "Answer should list all people whose team is the AI & Loopbrain Team.",
  },
  {
    id: "org-roles-1",
    question: "What roles exist in the Engineering department?",
    intent: "List roles associated with a department.",
    expectedShape:
      "Answer should list distinct roles/titles within the Engineering department.",
  },
  {
    id: "org-health-1",
    question: "Are there any single-person teams in our organization?",
    intent: "Org health check based on team sizes.",
    expectedShape:
      "Answer should state yes/no and optionally list the team(s) with a single member if present.",
  },
  {
    id: "org-health-2",
    question: "Which manager has the most direct reports?",
    intent: "Identify managers with largest span of control.",
    expectedShape:
      "Answer should name the manager with the highest number of direct reports, optionally with the count.",
  },
];

