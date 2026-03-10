 
/**
 * DEV SEED SCRIPT - Loopwell Mock Org
 * 
 * ⚠️  SCHEMA MISMATCHES - This script needs adaptation for your schema:
 * 
 * 1. Teams: Schema uses `OrgTeam` with `workspaceId` + `departmentId` (not `orgId`)
 *    - Teams are workspace-scoped, not org-scoped
 *    - Requires creating departments first
 * 
 * 2. People: Schema uses `User` model (not `Person`)
 *    - People data (availability, capacity, roles, skills) reference User.id as `personId`
 * 
 * 3. Availability: Schema uses `PersonAvailabilityHealth` (not `PersonAvailability`)
 *    - Model: PersonAvailabilityHealth with fields: status, reason, startsAt, endsAt
 * 
 * 4. Capacity: Schema's `PersonCapacity` does NOT have `allocationPct` field
 *    - Only has: fte, shrinkagePct, reviewedAt
 * 
 * 5. Roles/Skills: Schema uses `OrgRoleTaxonomy` and `OrgSkillTaxonomy` (not `orgRole`, `orgSkill`)
 * 
 * 6. Team Membership: No `TeamMember` model - membership via `OrgPosition.teamId`
 * 
 * 7. Team Leads: No `leadPersonId` field on teams
 * 
 * 8. Person Skills: No `PersonSkill` model in schema - skills may be in User.skills[] array
 * 
 * TODO: Adapt this script to match your actual schema, or update schema to match script assumptions.
 */
const { PrismaClient } = require("@prisma/client")
const { config } = require("dotenv")
const { resolve } = require("path")

// Load environment variables from .env.local (same as seed.ts)
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

async function getTargetOrgId() {
  const envOrgId = process.env.ORG_ID
  if (envOrgId) return String(envOrgId)

  // Prefer an existing workspace (orgId and workspaceId are equivalent in this codebase)
  const existing = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  }).catch(() => null)

  if (existing?.id) return String(existing.id)

  // Fallback: create one if your schema allows it
  let created
  try {
    // Need to get a user to set as owner - use first user or create a system user
    let firstUser = await prisma.user.findFirst({
      select: { id: true },
    })
    if (!firstUser) {
      // Create a default system user if none exists
      console.log("No user found. Creating default system user...")
      firstUser = await prisma.user.create({
        data: {
          name: "System User",
          email: `system-${Date.now()}@loopwell.mock`,
        },
        select: { id: true },
      })
    }
    created = await prisma.workspace.create({
      data: { 
        name: "Loopwell (Mock Org)",
        slug: `loopwell-mock-${Date.now()}`,
        ownerId: firstUser.id,
      },
      select: { id: true },
    })
  } catch (createError) {
    console.error("Failed to create workspace:", createError.message)
    throw new Error(`No workspace found and could not create one: ${createError.message}. Set ORG_ID env var to an existing workspace id.`)
  }

  if (!created?.id) {
    throw new Error("No workspace found and could not create one. Set ORG_ID env var to an existing workspace id.")
  }

  return String(created.id)
}

async function upsertRole(orgId, label) {
  const v = String(label || "").trim()
  if (!v) return
  await prisma.orgRoleTaxonomy.create({
    data: { workspaceId: orgId, label: v },
  }).catch(async () => {
    // ignore duplicates
  })
}

async function upsertSkill(orgId, label) {
  const v = String(label || "").trim().toLowerCase()
  if (!v) return
  await prisma.orgSkillTaxonomy.create({
    data: { workspaceId: orgId, label: v },
  }).catch(async () => {
    // ignore duplicates
  })
}

async function upsertDepartment(workspaceId, name) {
  const existing = await prisma.orgDepartment.findFirst({
    where: { workspaceId, name },
    select: { id: true, name: true },
  }).catch(() => null)

  if (existing?.id) return existing

  const created = await prisma.orgDepartment.create({
    data: { workspaceId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertTeam(workspaceId, departmentId, name) {
  const existing = await prisma.orgTeam.findFirst({
    where: { workspaceId, departmentId, name },
    select: { id: true, name: true },
  }).catch(() => null)

  if (existing?.id) return existing

  const created = await prisma.orgTeam.create({
    data: { workspaceId, departmentId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertDomain(orgId, name) {
  const existing = await prisma.domain.findFirst({
    where: { workspaceId: orgId, name },
    select: { id: true, name: true },
  }).catch(() => null)

  if (existing?.id) return existing

  const created = await prisma.domain.create({
    data: { workspaceId: orgId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertSystem(orgId, name) {
  // model name assumed as systemEntity (per earlier work). If yours differs, change here.
  const existing = await prisma.systemEntity.findFirst({
    where: { workspaceId: orgId, name },
    select: { id: true, name: true },
  }).catch(() => null)

  if (existing?.id) return existing

  const created = await prisma.systemEntity.create({
    data: { workspaceId: orgId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertPerson(orgId, p) {
  const email = p.email ? String(p.email).toLowerCase() : null
  if (!email) {
    throw new Error(`Person must have email: ${p.name}`)
  }

  // User model doesn't have orgId - users are global, personId in org models references User.id
  let existing = null
  existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  }).catch(() => null)

  if (existing?.id) {
    // Update name if provided
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: p.name },
    }).catch(() => null)
    return { id: String(existing.id), email }
  }

  // Create new user
  const created = await prisma.user.create({
    data: {
      name: p.name,
      email,
    },
    select: { id: true },
  })
  return { id: String(created.id), email }
}

async function setAvailability(workspaceId, personId, status, reason) {
  // Use PersonAvailabilityHealth which has status and reason fields
  await prisma.personAvailabilityHealth.upsert({
    where: { workspaceId_personId: { workspaceId, personId } },
    update: { status, reason: reason || null },
    create: { workspaceId, personId, status, reason: reason || null },
  }).catch(() => null)
}

async function setCapacity(orgId, personId, fte, shrinkagePct, allocationPct) {
  // PersonCapacity model uses workspaceId and doesn't have allocationPct field
  await prisma.personCapacity.upsert({
    where: { workspaceId_personId: { workspaceId: orgId, personId } },
    update: {
      fte,
      shrinkagePct,
      // Note: allocationPct not in schema, skipping
    },
    create: {
      workspaceId: orgId,
      personId,
      fte,
      shrinkagePct,
      // Note: allocationPct not in schema, skipping
    },
  }).catch(() => null)
}

async function setRoles(orgId, personId, roles) {
  // overwrite roles for clarity in mock data
  await prisma.personRoleAssignment.deleteMany({ where: { workspaceId: orgId, personId } }).catch(() => null)

  const cleaned = roles
    .map((r) => ({ role: String(r.role || "").trim(), percent: Math.round(Number(r.percent || 100)) }))
    .filter((r) => r.role && r.percent > 0 && r.percent <= 200)
    .slice(0, 10)

  if (!cleaned.length) return

  await prisma.personRoleAssignment.createMany({
    data: cleaned.map((r) => ({ workspaceId: orgId, personId, role: r.role, percent: r.percent })),
    skipDuplicates: true,
  }).catch(() => null)

  // also ensure taxonomy
  for (const r of cleaned) await upsertRole(orgId, r.role)
}

async function setSkills(workspaceId, personId, skills) {
  await prisma.personSkill.deleteMany({ where: { workspaceId, personId } }).catch(() => null)

  const cleaned = uniq(skills.map((s) => String(s || "").trim().toLowerCase())).slice(0, 50)
  if (!cleaned.length) return

  // First ensure all skills exist in taxonomy and get their IDs
  // Note: orgId and workspaceId are equivalent in this codebase
  const orgId = workspaceId
  const skillIds = []
  for (const skillLabel of cleaned) {
    // Ensure skill exists in taxonomy
    await upsertSkill(orgId, skillLabel)
    // Get the skill ID
    const skill = await prisma.orgSkillTaxonomy.findUnique({
      where: { workspaceId_label: { workspaceId: orgId, label: skillLabel } },
      select: { id: true },
    }).catch(() => null)
    if (skill?.id) {
      skillIds.push(skill.id)
    }
  }

  if (!skillIds.length) return

  await prisma.personSkill.createMany({
    data: skillIds.map((skillId) => ({ workspaceId, personId, skillId })),
    skipDuplicates: true,
  }).catch(() => null)
}

async function setTeamMembers(workspaceId, teamId, personIds) {
  // Team membership is via OrgPosition.teamId, not a separate TeamMember model
  // For now, skip team membership setup as it requires creating OrgPosition records
  // which is more complex (requires department, title, etc.)
  console.log(`Skipping team membership for team ${teamId} - ${personIds.length} members (requires OrgPosition setup)`)
  // TODO: Implement team membership via OrgPosition if needed
}

async function setManager(workspaceId, personId, managerId) {
  // model uses workspaceId (not orgId)
  await prisma.personManagerLink.deleteMany({ where: { workspaceId, personId } }).catch(() => null)
  if (!managerId) return
  await prisma.personManagerLink.create({
    data: { workspaceId, personId, managerId },
  }).catch(() => null)
}

async function setTeamLead(teamId, leadPersonId) {
  await prisma.orgTeam.update({
    where: { id: teamId },
    data: { ownerPersonId: leadPersonId || null },
  }).catch(() => null)
}

async function setOwner(workspaceId, entityType, entityId, ownerPersonId) {
  // model uses workspaceId, entityType, entityId, ownerPersonId (not personId)
  // We set exactly one primary owner; leave some entities intentionally unowned (skip call)
  await prisma.ownerAssignment.deleteMany({ where: { workspaceId, entityType, entityId } }).catch(() => null)

  await prisma.ownerAssignment.create({
    data: {
      workspaceId,
      entityType,
      entityId,
      ownerPersonId: ownerPersonId,
    },
  }).catch(() => null)
}

async function main() {
  const orgId = await getTargetOrgId()
  const workspaceId = orgId // orgId and workspaceId are equivalent in this codebase
  console.log("Seeding Org mock data into workspaceId:", workspaceId)

  // 0) Create a default department (teams require a department)
  const defaultDept = await upsertDepartment(workspaceId, "Default Department")
  
  // 1) Teams
  const teamNames = [
    "Product",
    "Engineering",
    "Compliance & FinCrime",
    "Operations",
    "Data & Risk",
    "Leadership / G&A",
  ]
  const teams = {}
  for (const name of teamNames) teams[name] = await upsertTeam(workspaceId, defaultDept.id, name)

  // 2) Domains
  const domainNames = [
    "Payments",
    "Customer Verification",
    "Fraud Detection",
    "Case Management",
    "Reporting & Analytics",
  ]
  const domains = {}
  for (const name of domainNames) domains[name] = await upsertDomain(orgId, name)

  // 3) Systems
  const systemNames = [
    "Core Payments API",
    "KYC Vendor Integration",
    "Fraud Rules Engine",
    "Case Tool",
    "Data Warehouse",
    "Internal Admin Tool",
    "Monitoring & Alerts",
  ]
  const systems = {}
  for (const name of systemNames) systems[name] = await upsertSystem(orgId, name)

  // 4) People (45)
  // NOTE: Emails use @loopwell.mock so it's clearly non-real.
  const peopleSeed = [
    // Leadership / G&A (3)
    { name: "Marta Kalda", email: "marta.kalda@loopwell.mock", title: "CEO", team: "Leadership / G&A" },
    { name: "Rainer Tamm", email: "rainer.tamm@loopwell.mock", title: "COO", team: "Leadership / G&A" },
    { name: "Liis Saar", email: "liis.saar@loopwell.mock", title: "Head of People", team: "Leadership / G&A" },

    // Product (4)
    { name: "Eva Kask", email: "eva.kask@loopwell.mock", title: "Senior Product Manager", team: "Product" },
    { name: "Marko Ilves", email: "marko.ilves@loopwell.mock", title: "Product Manager", team: "Product" },
    { name: "Kertu Pohl", email: "kertu.pohl@loopwell.mock", title: "Product Designer", team: "Product" },
    { name: "Jonas Muld", email: "jonas.muld@loopwell.mock", title: "UX Researcher", team: "Product" },

    // Engineering (15)
    { name: "Kristjan Lepp", email: "kristjan.lepp@loopwell.mock", title: "Engineering Manager", team: "Engineering" },
    { name: "Sofia Vaher", email: "sofia.vaher@loopwell.mock", title: "Engineering Manager", team: "Engineering" },
    { name: "Andres Pruul", email: "andres.pruul@loopwell.mock", title: "Senior Engineer", team: "Engineering" },
    { name: "Nikita Orlov", email: "nikita.orlov@loopwell.mock", title: "Senior Engineer", team: "Engineering" },
    { name: "Helena Kivi", email: "helena.kivi@loopwell.mock", title: "Senior Engineer", team: "Engineering" },
    { name: "Taavi Mets", email: "taavi.mets@loopwell.mock", title: "Senior Engineer", team: "Engineering" },
    { name: "Oskar Juur", email: "oskar.juur@loopwell.mock", title: "Senior Engineer", team: "Engineering" },
    { name: "Anni Ruut", email: "anni.ruut@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Priit Koppel", email: "priit.koppel@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Grete Jogi", email: "grete.jogi@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Mihkel Kask", email: "mihkel.kask@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Daria Volkova", email: "daria.volkova@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Roman Petrov", email: "roman.petrov@loopwell.mock", title: "Software Engineer", team: "Engineering" },
    { name: "Karin Laas", email: "karin.laas@loopwell.mock", title: "Junior Engineer", team: "Engineering" },
    { name: "Sander Oja", email: "sander.oja@loopwell.mock", title: "Junior Engineer", team: "Engineering" },

    // Compliance & FinCrime (10)
    { name: "Aleksei Sokolov", email: "aleksei.sokolov@loopwell.mock", title: "Head of Compliance", team: "Compliance & FinCrime" },
    { name: "Maarja Uibo", email: "maarja.uibo@loopwell.mock", title: "Compliance Officer", team: "Compliance & FinCrime" },
    { name: "Kadi Sild", email: "kadi.sild@loopwell.mock", title: "Policy Specialist", team: "Compliance & FinCrime" },
    { name: "Sergei Ivanov", email: "sergei.ivanov@loopwell.mock", title: "FinCrime Analyst", team: "Compliance & FinCrime" },
    { name: "Annika Vool", email: "annika.vool@loopwell.mock", title: "FinCrime Analyst", team: "Compliance & FinCrime" },
    { name: "Maria Laan", email: "maria.laan@loopwell.mock", title: "FinCrime Analyst", team: "Compliance & FinCrime" },
    { name: "Denis Smirnov", email: "denis.smirnov@loopwell.mock", title: "FinCrime Analyst", team: "Compliance & FinCrime" },
    { name: "Ksenia Morozova", email: "ksenia.morozova@loopwell.mock", title: "FinCrime Analyst", team: "Compliance & FinCrime" },
    { name: "Jelena Kuznetsova", email: "jelena.kuznetsova@loopwell.mock", title: "QA Specialist", team: "Compliance & FinCrime" },
    { name: "Paul Raud", email: "paul.raud@loopwell.mock", title: "QA Specialist", team: "Compliance & FinCrime" },

    // Operations (8)
    { name: "Kadri Magi", email: "kadri.magi@loopwell.mock", title: "Operations Manager", team: "Operations" },
    { name: "Risto Kuus", email: "risto.kuus@loopwell.mock", title: "Operations Specialist", team: "Operations" },
    { name: "Elina Parts", email: "elina.parts@loopwell.mock", title: "Operations Specialist", team: "Operations" },
    { name: "Marek Pihlak", email: "marek.pihlak@loopwell.mock", title: "Operations Specialist", team: "Operations" },
    { name: "Silvia Noor", email: "silvia.noor@loopwell.mock", title: "Operations Specialist", team: "Operations" },
    { name: "Lauri Roos", email: "lauri.roos@loopwell.mock", title: "Support Ops", team: "Operations" },
    { name: "Egle Hunt", email: "egle.hunt@loopwell.mock", title: "Support Ops", team: "Operations" },
    { name: "Vlad Mironov", email: "vlad.mironov@loopwell.mock", title: "Support Ops", team: "Operations" },

    // Data & Risk (5)
    { name: "Kristi Teder", email: "kristi.teder@loopwell.mock", title: "Data Analyst", team: "Data & Risk" },
    { name: "Artem Pavlov", email: "artem.pavlov@loopwell.mock", title: "Data Analyst", team: "Data & Risk" },
    { name: "Hanna Veskimagi", email: "hanna.veskimagi@loopwell.mock", title: "Risk Analyst", team: "Data & Risk" },
    { name: "Igor Belov", email: "igor.belov@loopwell.mock", title: "Risk Analyst", team: "Data & Risk" },
    { name: "Karl Sein", email: "karl.sein@loopwell.mock", title: "Data Engineer", team: "Data & Risk" },
  ]

  // Create persons and keep id map
  const personIdByEmail = {}
  for (const p of peopleSeed) {
    const row = await upsertPerson(orgId, p)
    personIdByEmail[p.email.toLowerCase()] = row.id
  }

  // 5) Team membership (clear & set)
  const membersByTeam = {
    "Leadership / G&A": ["marta.kalda@loopwell.mock", "rainer.tamm@loopwell.mock", "liis.saar@loopwell.mock"],
    "Product": ["eva.kask@loopwell.mock", "marko.ilves@loopwell.mock", "kertu.pohl@loopwell.mock", "jonas.muld@loopwell.mock"],
    "Engineering": [
      "kristjan.lepp@loopwell.mock", "sofia.vaher@loopwell.mock",
      "andres.pruul@loopwell.mock", "nikita.orlov@loopwell.mock", "helena.kivi@loopwell.mock", "taavi.mets@loopwell.mock", "oskar.juur@loopwell.mock",
      "anni.ruut@loopwell.mock", "priit.koppel@loopwell.mock", "grete.jogi@loopwell.mock", "mihkel.kask@loopwell.mock", "daria.volkova@loopwell.mock", "roman.petrov@loopwell.mock",
      "karin.laas@loopwell.mock", "sander.oja@loopwell.mock",
    ],
    "Compliance & FinCrime": [
      "aleksei.sokolov@loopwell.mock", "maarja.uibo@loopwell.mock", "kadi.sild@loopwell.mock",
      "sergei.ivanov@loopwell.mock", "annika.vool@loopwell.mock", "maria.laan@loopwell.mock", "denis.smirnov@loopwell.mock", "ksenia.morozova@loopwell.mock",
      "jelena.kuznetsova@loopwell.mock", "paul.raud@loopwell.mock",
    ],
    "Operations": [
      "kadri.magi@loopwell.mock", "risto.kuus@loopwell.mock", "elina.parts@loopwell.mock", "marek.pihlak@loopwell.mock", "silvia.noor@loopwell.mock",
      "lauri.roos@loopwell.mock", "egle.hunt@loopwell.mock", "vlad.mironov@loopwell.mock",
    ],
    "Data & Risk": ["kristi.teder@loopwell.mock", "artem.pavlov@loopwell.mock", "hanna.veskimagi@loopwell.mock", "igor.belov@loopwell.mock", "karl.sein@loopwell.mock"],
  }

  for (const [teamName, emails] of Object.entries(membersByTeam)) {
    const team = teams[teamName]
    const ids = emails.map((e) => personIdByEmail[String(e).toLowerCase()]).filter(Boolean)
    await setTeamMembers(workspaceId, team.id, ids)
  }

  // 6) Team leads
  await setTeamLead(teams["Product"].id, personIdByEmail["eva.kask@loopwell.mock"])
  await setTeamLead(teams["Engineering"].id, personIdByEmail["kristjan.lepp@loopwell.mock"])
  await setTeamLead(teams["Compliance & FinCrime"].id, personIdByEmail["aleksei.sokolov@loopwell.mock"])
  await setTeamLead(teams["Operations"].id, personIdByEmail["kadri.magi@loopwell.mock"])
  await setTeamLead(teams["Data & Risk"].id, personIdByEmail["karl.sein@loopwell.mock"])

  // 7) Managers (simple but realistic)
  // Engineering: one EM overloaded (intentional)
  const em1 = personIdByEmail["kristjan.lepp@loopwell.mock"]
  const em2 = personIdByEmail["sofia.vaher@loopwell.mock"]

  const engReportsEm1 = [
    "andres.pruul@loopwell.mock","nikita.orlov@loopwell.mock","helena.kivi@loopwell.mock","taavi.mets@loopwell.mock","oskar.juur@loopwell.mock",
    "anni.ruut@loopwell.mock","priit.koppel@loopwell.mock","grete.jogi@loopwell.mock","mihkel.kask@loopwell.mock","daria.volkova@loopwell.mock",
  ]
  const engReportsEm2 = ["roman.petrov@loopwell.mock","karin.laas@loopwell.mock","sander.oja@loopwell.mock"]

  for (const e of engReportsEm1) await setManager(workspaceId, personIdByEmail[e], em1)
  for (const e of engReportsEm2) await setManager(workspaceId, personIdByEmail[e], em2)

  // Product reports to COO (simple)
  const coo = personIdByEmail["rainer.tamm@loopwell.mock"]
  for (const e of ["eva.kask@loopwell.mock","marko.ilves@loopwell.mock","kertu.pohl@loopwell.mock","jonas.muld@loopwell.mock"]) {
    await setManager(workspaceId, personIdByEmail[e], coo)
  }

  // Compliance reports to COO; analysts report to Head of Compliance
  const hoc = personIdByEmail["aleksei.sokolov@loopwell.mock"]
  await setManager(workspaceId, hoc, coo)
  for (const e of [
    "maarja.uibo@loopwell.mock","kadi.sild@loopwell.mock","sergei.ivanov@loopwell.mock","annika.vool@loopwell.mock","maria.laan@loopwell.mock",
    "denis.smirnov@loopwell.mock","ksenia.morozova@loopwell.mock","jelena.kuznetsova@loopwell.mock","paul.raud@loopwell.mock",
  ]) {
    await setManager(workspaceId, personIdByEmail[e], hoc)
  }

  // Ops reports to COO
  const opsM = personIdByEmail["kadri.magi@loopwell.mock"]
  await setManager(workspaceId, opsM, coo)
  for (const e of [
    "risto.kuus@loopwell.mock","elina.parts@loopwell.mock","marek.pihlak@loopwell.mock","silvia.noor@loopwell.mock",
    "lauri.roos@loopwell.mock","egle.hunt@loopwell.mock","vlad.mironov@loopwell.mock",
  ]) {
    await setManager(workspaceId, personIdByEmail[e], opsM)
  }

  // Data & Risk reports to COO
  const de = personIdByEmail["karl.sein@loopwell.mock"]
  await setManager(workspaceId, de, coo)
  for (const e of ["kristi.teder@loopwell.mock","artem.pavlov@loopwell.mock","hanna.veskimagi@loopwell.mock","igor.belov@loopwell.mock"]) {
    await setManager(workspaceId, personIdByEmail[e], de)
  }

  // 8) Roles + Skills (taxonomy will be populated as a side-effect)
  // Keep it sparse: enough to be believable without noise.
  const roleSkillPlan = [
    // Leadership
    ["marta.kalda@loopwell.mock", [{ role: "CEO", percent: 100 }], ["strategy","stakeholder management","incident response"]],
    ["rainer.tamm@loopwell.mock", [{ role: "COO", percent: 100 }], ["operations","process design","incident response"]],
    ["liis.saar@loopwell.mock", [{ role: "Head of People", percent: 100 }], ["people ops","hiring","performance management"]],

    // Product
    ["eva.kask@loopwell.mock", [{ role: "Senior Product Manager", percent: 100 }], ["product","payments knowledge","stakeholder management"]],
    ["marko.ilves@loopwell.mock", [{ role: "Product Manager", percent: 100 }], ["product","fraud detection","requirements"]],
    ["kertu.pohl@loopwell.mock", [{ role: "Designer", percent: 100 }], ["design","ux","research"]],
    ["jonas.muld@loopwell.mock", [{ role: "UX Researcher", percent: 100 }], ["research","ux","customer interviews"]],

    // Engineering managers
    ["kristjan.lepp@loopwell.mock", [{ role: "Engineering Manager", percent: 100 }], ["incident response","platform","leadership"]],
    ["sofia.vaher@loopwell.mock", [{ role: "Engineering Manager", percent: 100 }], ["payments knowledge","vendor integrations","delivery"]],

    // Senior Eng (rare skills included)
    ["andres.pruul@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["node","sql","payments knowledge"]],
    ["nikita.orlov@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["react","node","internal tools"]],
    ["helena.kivi@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["vendor integrations","monitoring","incident response"]],
    ["taavi.mets@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["data modeling","sql","etl"]],
    ["oskar.juur@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["rule tuning","fraud detection","node"]],

    // Engineers
    ["anni.ruut@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["react","node","payments knowledge"]],
    ["priit.koppel@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["node","sql","monitoring"]],
    ["grete.jogi@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["react","internal tools","ux"]],
    ["mihkel.kask@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["node","vendor integrations","payments knowledge"]],
    ["daria.volkova@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["sql","etl","reporting"]],
    ["roman.petrov@loopwell.mock", [{ role: "Software Engineer", percent: 100 }], ["node","case management","integrations"]],
    ["karin.laas@loopwell.mock", [{ role: "Junior Engineer", percent: 100 }], ["react","sql"]],
    ["sander.oja@loopwell.mock", [{ role: "Junior Engineer", percent: 100 }], ["node","testing"]],

    // Compliance
    ["aleksei.sokolov@loopwell.mock", [{ role: "Head of Compliance", percent: 100 }], ["compliance","regulatory reporting","incident response"]],
    ["maarja.uibo@loopwell.mock", [{ role: "Compliance Officer", percent: 100 }], ["compliance","policy","risk assessment"]],
    ["kadi.sild@loopwell.mock", [{ role: "Policy Specialist", percent: 100 }], ["policy","regulatory reporting","process design"]],
    ["sergei.ivanov@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["investigations","sanctions screening","risk"]],
    ["annika.vool@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["investigations","fraud detection","risk assessment"]],
    ["maria.laan@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["case management","investigations","risk"]],
    ["denis.smirnov@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["investigations","rule tuning","fraud detection"]],
    ["ksenia.morozova@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["investigations","sql","reporting"]],
    ["jelena.kuznetsova@loopwell.mock", [{ role: "QA Specialist", percent: 100 }], ["qa","risk","process design"]],
    ["paul.raud@loopwell.mock", [{ role: "QA Specialist", percent: 100 }], ["qa","compliance","findings"]],

    // Ops
    ["kadri.magi@loopwell.mock", [{ role: "Operations Manager", percent: 100 }], ["operations","process design","incident response"]],
    ["risto.kuus@loopwell.mock", [{ role: "Operations Specialist", percent: 100 }], ["operations","case management","customer support"]],
    ["elina.parts@loopwell.mock", [{ role: "Operations Specialist", percent: 100 }], ["operations","payments knowledge","customer support"]],
    ["marek.pihlak@loopwell.mock", [{ role: "Operations Specialist", percent: 100 }], ["operations","fraud detection","investigations"]],
    ["silvia.noor@loopwell.mock", [{ role: "Operations Specialist", percent: 100 }], ["operations","risk","case management"]],
    ["lauri.roos@loopwell.mock", [{ role: "Support Ops", percent: 100 }], ["customer support","operations"]],
    ["egle.hunt@loopwell.mock", [{ role: "Support Ops", percent: 100 }], ["customer support","case management"]],
    ["vlad.mironov@loopwell.mock", [{ role: "Support Ops", percent: 100 }], ["customer support","payments knowledge"]],

    // Data & Risk
    ["kristi.teder@loopwell.mock", [{ role: "Data Analyst", percent: 100 }], ["sql","reporting","risk"]],
    ["artem.pavlov@loopwell.mock", [{ role: "Data Analyst", percent: 100 }], ["sql","dashboards","fraud detection"]],
    ["hanna.veskimagi@loopwell.mock", [{ role: "Risk Analyst", percent: 100 }], ["risk assessment","fraud detection","reporting"]],
    ["igor.belov@loopwell.mock", [{ role: "Risk Analyst", percent: 100 }], ["risk","policy","investigations"]],
    ["karl.sein@loopwell.mock", [{ role: "Data Engineer", percent: 100 }], ["etl","data modeling","sql"]],
  ]

  for (const [email, roles, skills] of roleSkillPlan) {
    const pid = personIdByEmail[String(email).toLowerCase()]
    await setRoles(orgId, pid, roles) // PersonRoleAssignment uses workspaceId
    await setSkills(workspaceId, pid, skills) // PersonSkill uses workspaceId
  }

  // 9) Availability (mixed, slightly messy)
  const AV = {
    AVAILABLE: "AVAILABLE",
    LIMITED: "LIMITED",
    UNAVAILABLE: "UNAVAILABLE",
  }

  const availabilityPlan = [
    // Leadership mostly limited
    ["marta.kalda@loopwell.mock", AV.LIMITED, "Exec priorities"],
    ["rainer.tamm@loopwell.mock", AV.LIMITED, "Operational load"],
    ["liis.saar@loopwell.mock", AV.LIMITED, "Hiring cycle"],

    // Product PMs overloaded
    ["eva.kask@loopwell.mock", AV.LIMITED, "Roadmap delivery"],
    ["marko.ilves@loopwell.mock", AV.LIMITED, "Discovery + execution"],
    ["kertu.pohl@loopwell.mock", AV.AVAILABLE, null],
    ["jonas.muld@loopwell.mock", AV.LIMITED, "Shared across teams"],

    // Engineering: one critical engineer unavailable
    ["helena.kivi@loopwell.mock", AV.UNAVAILABLE, "On leave (2 weeks)"],
    ["andres.pruul@loopwell.mock", AV.LIMITED, "On-call rotation"],
    ["nikita.orlov@loopwell.mock", AV.AVAILABLE, null],
    ["taavi.mets@loopwell.mock", AV.AVAILABLE, null],
    ["oskar.juur@loopwell.mock", AV.LIMITED, "Incident follow-ups"],

    // Compliance frequently limited
    ["aleksei.sokolov@loopwell.mock", AV.LIMITED, "Regulatory deadline"],
    ["sergei.ivanov@loopwell.mock", AV.LIMITED, "Case backlog"],
    ["annika.vool@loopwell.mock", AV.LIMITED, "Case backlog"],

    // Ops mixed
    ["kadri.magi@loopwell.mock", AV.LIMITED, "Peak workload"],
    ["lauri.roos@loopwell.mock", AV.AVAILABLE, null],

    // Data / Risk
    ["karl.sein@loopwell.mock", AV.LIMITED, "Pipeline maintenance"],
    ["kristi.teder@loopwell.mock", AV.AVAILABLE, null],
  ]

  for (const [email, status, reason] of availabilityPlan) {
    const pid = personIdByEmail[String(email).toLowerCase()]
    await setAvailability(workspaceId, pid, status, reason)
  }

  // 10) Capacity (set for ~15 key people)
  // allocationPct: planned allocation; shrinkagePct: effective loss; fte: base capacity
  const capacityPlan = [
    // Product overloaded
    ["eva.kask@loopwell.mock", 1.0, 20, 125],
    ["marko.ilves@loopwell.mock", 1.0, 20, 120],

    // Engineering managers + key seniors
    ["kristjan.lepp@loopwell.mock", 1.0, 25, 115],
    ["sofia.vaher@loopwell.mock", 1.0, 20, 105],
    ["andres.pruul@loopwell.mock", 1.0, 20, 110],
    ["helena.kivi@loopwell.mock", 1.0, 20, 90], // unavailable but still has plan
    ["oskar.juur@loopwell.mock", 1.0, 20, 120],

    // Compliance heavy shrinkage
    ["aleksei.sokolov@loopwell.mock", 1.0, 35, 110],
    ["sergei.ivanov@loopwell.mock", 1.0, 40, 115],
    ["jelena.kuznetsova@loopwell.mock", 1.0, 35, 95],

    // Ops moderate shrinkage
    ["kadri.magi@loopwell.mock", 1.0, 30, 105],
    ["risto.kuus@loopwell.mock", 1.0, 25, 95],

    // Data & Risk rare skills
    ["karl.sein@loopwell.mock", 1.0, 20, 115],
    ["hanna.veskimagi@loopwell.mock", 1.0, 20, 90],
    ["kristi.teder@loopwell.mock", 1.0, 15, 85],
  ]

  for (const [email, fte, shrinkagePct, allocationPct] of capacityPlan) {
    const pid = personIdByEmail[String(email).toLowerCase()]
    await setCapacity(orgId, pid, fte, shrinkagePct, allocationPct)
  }

  // 11) Ownership (intentional gaps)
  // TEAM owners: all owned
  await setOwner(workspaceId, "TEAM", teams["Product"].id, personIdByEmail["eva.kask@loopwell.mock"])
  await setOwner(workspaceId, "TEAM", teams["Engineering"].id, personIdByEmail["kristjan.lepp@loopwell.mock"])
  await setOwner(workspaceId, "TEAM", teams["Compliance & FinCrime"].id, personIdByEmail["aleksei.sokolov@loopwell.mock"])
  await setOwner(workspaceId, "TEAM", teams["Operations"].id, personIdByEmail["kadri.magi@loopwell.mock"])
  await setOwner(workspaceId, "TEAM", teams["Data & Risk"].id, personIdByEmail["karl.sein@loopwell.mock"])
  await setOwner(workspaceId, "TEAM", teams["Leadership / G&A"].id, personIdByEmail["marta.kalda@loopwell.mock"])

  // DOMAIN owners: Fraud Detection intentionally unowned
  await setOwner(workspaceId, "DOMAIN", domains["Payments"].id, personIdByEmail["sofia.vaher@loopwell.mock"])
  await setOwner(workspaceId, "DOMAIN", domains["Customer Verification"].id, personIdByEmail["maarja.uibo@loopwell.mock"])
  // skip Fraud Detection (unowned)
  await setOwner(workspaceId, "DOMAIN", domains["Case Management"].id, personIdByEmail["roman.petrov@loopwell.mock"])
  await setOwner(workspaceId, "DOMAIN", domains["Reporting & Analytics"].id, personIdByEmail["karl.sein@loopwell.mock"])

  // SYSTEM owners: Fraud Rules Engine + Internal Admin Tool intentionally unowned
  await setOwner(workspaceId, "SYSTEM", systems["Core Payments API"].id, personIdByEmail["andres.pruul@loopwell.mock"])
  await setOwner(workspaceId, "SYSTEM", systems["KYC Vendor Integration"].id, personIdByEmail["helena.kivi@loopwell.mock"])
  // skip Fraud Rules Engine (unowned)
  await setOwner(workspaceId, "SYSTEM", systems["Case Tool"].id, personIdByEmail["maria.laan@loopwell.mock"])
  await setOwner(workspaceId, "SYSTEM", systems["Data Warehouse"].id, personIdByEmail["karl.sein@loopwell.mock"])
  // skip Internal Admin Tool (unowned)
  await setOwner(workspaceId, "SYSTEM", systems["Monitoring & Alerts"].id, personIdByEmail["priit.koppel@loopwell.mock"])

  console.log("✅ Mock org seeded successfully.")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

