import { prisma } from "@/lib/db";

type GuidanceItem = {
  key: string;
  label: string;
  description: string;
  issueType: string;
  count: number;
  weight: number;
};

export async function computeOrgGuidance(workspaceId: string) {
  // Pull unresolved issue counts
  const [missingManager, missingTeam, missingRole] = await Promise.all([
    prisma.orgPersonIssue.count({ where: { workspaceId, type: "MISSING_MANAGER", resolvedAt: null } }),
    prisma.orgPersonIssue.count({ where: { workspaceId, type: "MISSING_TEAM", resolvedAt: null } }),
    prisma.orgPersonIssue.count({ where: { workspaceId, type: "MISSING_ROLE", resolvedAt: null } }),
  ]);

  const openDuplicates = await prisma.orgDuplicateCandidate.count({
    where: { workspaceId, status: "OPEN" },
  });

  const items: GuidanceItem[] = [
    {
      key: "missing_manager",
      label: "Assign reporting lines",
      description: "People without managers block org clarity and downstream insights.",
      issueType: "MISSING_MANAGER",
      count: missingManager,
      weight: 0.45,
    },
    {
      key: "missing_team",
      label: "Assign teams",
      description: "Team assignment enables grouping, ownership, and analysis.",
      issueType: "MISSING_TEAM",
      count: missingTeam,
      weight: 0.25,
    },
    {
      key: "missing_role",
      label: "Assign roles",
      description: "Roles unlock role-based insights and leadership structure.",
      issueType: "MISSING_ROLE",
      count: missingRole,
      weight: 0.20,
    },
    {
      key: "duplicates",
      label: "Resolve duplicates",
      description: "Duplicates distort org metrics and reporting lines.",
      issueType: "DUPLICATE_PERSON",
      count: openDuplicates,
      weight: 0.10,
    },
  ];

  // Score impact = count × weight
  const ranked = items
    .filter((i) => i.count > 0)
    .map((i) => ({ ...i, impact: i.count * i.weight }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return ranked;
}

