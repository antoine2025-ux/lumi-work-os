import { prisma } from "@/lib/db"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"

export async function ensureDefaultTaxonomy(orgId: string) {
  const defaultRoles = [
    "Engineer",
    "Product Manager",
    "Designer",
    "QA",
    "Analyst",
    "Data",
    "Operations",
    "Compliance",
  ]

  const defaultSkills = [
    "react",
    "node",
    "sql",
    "risk",
    "compliance",
    "fincrime",
    "investigations",
    "product",
    "design",
  ]

  const [roleCount, skillCount] = await Promise.all([
    prisma.orgRoleTaxonomy.count({ where: { workspaceId: orgId } }),
    prisma.orgSkillTaxonomy.count({ where: { workspaceId: orgId } }),
  ])

  if (roleCount === 0) {
    await prisma.orgRoleTaxonomy.createMany({
      data: defaultRoles.map((r) => ({ workspaceId: orgId, label: normalizeRole(r) })),
      skipDuplicates: true,
    })
  }

  if (skillCount === 0) {
    await prisma.orgSkillTaxonomy.createMany({
      data: defaultSkills.map((s) => ({ workspaceId: orgId, label: normalizeSkill(s) })),
      skipDuplicates: true,
    })
  }
}
