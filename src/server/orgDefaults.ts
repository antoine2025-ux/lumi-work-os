import { prisma } from "@/lib/db";

export async function ensureDefaultLandingViews(workspaceId: string) {
  const defaults = [
    { role: "EXECUTIVE", viewKey: "leadership_structure" },
    { role: "HR", viewKey: "new_hires_review" },
    { role: "MANAGER", viewKey: "org_risks" },
  ];

  for (const d of defaults) {
    await prisma.orgDefaultView.upsert({
      where: { workspaceId_role: { workspaceId, role: d.role } },
      update: {},
      create: { workspaceId, role: d.role, viewKey: d.viewKey },
    });
  }
}

export async function getDefaultViewForRole(workspaceId: string, role: string) {
  return prisma.orgDefaultView.findUnique({
    where: { workspaceId_role: { workspaceId, role } },
  });
}

