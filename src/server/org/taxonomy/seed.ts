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
    prisma.orgRoleTaxonomy.count({ where: { orgId } as any }),
    prisma.orgSkillTaxonomy.count({ where: { orgId } as any }),
  ])

  if (roleCount === 0) {
    await prisma.orgRoleTaxonomy.createMany({
      data: defaultRoles.map((r) => ({ orgId, label: normalizeRole(r) })) as any,
      skipDuplicates: true,
    } as any)
  }

  if (skillCount === 0) {
    await prisma.orgSkillTaxonomy.createMany({
      data: defaultSkills.map((s) => ({ orgId, label: normalizeSkill(s) })) as any,
      skipDuplicates: true,
    } as any)
  }
}

