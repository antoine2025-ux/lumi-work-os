import { prisma } from "@/lib/prisma";

export async function ensureDefaultOrgViews(orgId: string) {
  const defaults = [
    {
      key: "leadership_structure",
      title: "Leadership structure",
      persona: "EXECUTIVE",
      description: "Visibility into managers, reporting gaps, and leadership coverage.",
      config: {
        issues: ["MISSING_MANAGER"],
        focus: "MANAGERS",
        sort: "team_size_desc",
      },
    },
    {
      key: "org_risks",
      title: "Org risks",
      persona: "EXECUTIVE",
      description: "Structural risks impacting clarity and accountability.",
      config: {
        issues: ["MISSING_MANAGER", "DUPLICATE_PERSON"],
        sort: "impact_desc",
      },
    },
    {
      key: "new_hires_review",
      title: "New hires review",
      persona: "HR",
      description: "Ensure new joiners are fully modeled and connected.",
      config: {
        issues: ["MISSING_MANAGER", "MISSING_TEAM", "MISSING_ROLE"],
        hiredWithinDays: 30,
      },
    },
  ];

  for (const v of defaults) {
    await prisma.savedOrgView.upsert({
      where: { orgId_key: { orgId, key: v.key } },
      update: {},
      create: {
        orgId,
        key: v.key,
        title: v.title,
        description: v.description || null,
        persona: v.persona,
        config: v.config,
      },
    });
  }
}

