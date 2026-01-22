import { prisma } from "@/lib/db";

export async function ensureDefaultLandingViews(orgId: string) {
  const defaults = [
    { role: "EXECUTIVE", viewKey: "leadership_structure" },
    { role: "HR", viewKey: "new_hires_review" },
    { role: "MANAGER", viewKey: "org_risks" },
  ];

  for (const d of defaults) {
    await prisma.orgDefaultView.upsert({
      where: { orgId_role: { orgId, role: d.role } },
      update: {},
      create: { orgId, role: d.role, viewKey: d.viewKey },
    });
  }
}

export async function getDefaultViewForRole(orgId: string, role: string) {
  return prisma.orgDefaultView.findUnique({
    where: { orgId_role: { orgId, role } },
  });
}

