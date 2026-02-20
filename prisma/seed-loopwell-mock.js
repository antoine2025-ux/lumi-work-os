 
const { PrismaClient } = require("@prisma/client")
const { config } = require("dotenv")
const { resolve } = require("path")

// Load environment variables from .env.local (same as seed.ts)
config({ path: resolve(process.cwd(), ".env.local") })

const prisma = new PrismaClient()

/**
 * IMPORTANT:
 * This seed is adapted to the CURRENT schema:
 * - Teams: OrgTeam with workspaceId + departmentId
 * - Departments: OrgDepartment (workspaceId)
 * - People: User
 * - No assumptions about:
 *   - team lead fields
 *   - team membership join tables
 *
 * Optional extras are guarded with try/catch:
 * - Ownership (OwnerAssignment-like)
 * - Capacity (PersonCapacity-like)
 * - Domains/Systems (Domain/SystemEntity-like)
 */

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

async function getTargetWorkspaceId() {
  const envWs = process.env.WORKSPACE_ID
  if (envWs) {
    console.log("✅ Using WORKSPACE_ID from environment:", String(envWs))
    return String(envWs)
  }

  const ws = await prisma.workspace
    .findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } })
    .catch(() => null)

  if (ws?.id) {
    console.log("⚠️  No WORKSPACE_ID provided, using first workspace found:", String(ws.id))
    return String(ws.id)
  }

  // Default behavior: require WORKSPACE_ID unless explicitly allowed to create
  const allowCreate = process.env.ALLOW_CREATE_WORKSPACE === "1"
  
  if (!allowCreate) {
    console.error("❌ No workspace found and WORKSPACE_ID not provided.")
    console.error("   Options:")
    console.error("   1) Create a workspace via app UI, then rerun with: WORKSPACE_ID=<workspace-id> node prisma/seed-loopwell-mock.js")
    console.error("   2) Allow auto-create (dev only): ALLOW_CREATE_WORKSPACE=1 node prisma/seed-loopwell-mock.js")
    throw new Error("WORKSPACE_ID required. Create a workspace via app UI first, or set ALLOW_CREATE_WORKSPACE=1 to auto-create (dev only).")
  }

  // If DB has no workspace and auto-create is allowed, create one (dev convenience)
  console.log("⚠️  No workspace found. Auto-creating dev workspace (ALLOW_CREATE_WORKSPACE=1)...")

  const workspaceName = process.env.WORKSPACE_NAME || "Loopwell (Mock Workspace)"
  const workspaceSlug = (process.env.WORKSPACE_SLUG || "loopwell-mock")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

  // Workspace requires ownerId. Find or create a dev user for ownership.
  let ownerUser = await prisma.user.findFirst({ select: { id: true } }).catch(() => null)
  
  if (!ownerUser?.id) {
    // Create a minimal dev user if none exists
    try {
      ownerUser = await prisma.user.create({
        data: {
          email: "dev@loopwell.mock",
          name: "Dev User",
        },
        select: { id: true },
      })
      console.log("Created dev user for workspace ownership:", ownerUser.id)
    } catch (createUserErr) {
      console.error("Failed to create dev user for workspace ownership:", createUserErr.message)
      throw new Error("Cannot auto-create workspace: no users exist and user creation failed. Create a user first or provide WORKSPACE_ID.")
    }
  }

  // Try a few common workspace schemas. If your Workspace requires more fields,
  // the error message will tell you what's missing.
  const attempts = [
    { data: { name: workspaceName, slug: workspaceSlug, ownerId: ownerUser.id } },
    { data: { name: workspaceName, slug: workspaceSlug, ownerId: ownerUser.id, description: null } },
  ]

  let created = null
  let lastErr = null

  for (const a of attempts) {
    try {
      created = await prisma.workspace.create({ ...a, select: { id: true } })
      if (created?.id) break
    } catch (e) {
      lastErr = e
      // If slug conflict, try with timestamp
      if (e.code === "P2002" && e.meta?.target?.includes("slug")) {
        try {
          const slugWithTs = `${workspaceSlug}-${Date.now()}`
          created = await prisma.workspace.create({
            data: { name: workspaceName, slug: slugWithTs, ownerId: ownerUser.id },
            select: { id: true },
          })
          if (created?.id) break
        } catch (retryErr) {
          lastErr = retryErr
        }
      }
    }
  }

  if (!created?.id) {
    console.error("Failed to auto-create Workspace. Your Workspace model likely requires additional fields.")
    console.error("Set WORKSPACE_ID to an existing workspace, OR create one via your app's normal onboarding flow.")
    if (lastErr) {
      console.error("Last create error:", lastErr.message || lastErr)
    }
    throw new Error("Workspace auto-create failed. Provide WORKSPACE_ID or create workspace in-app.")
  }

  console.log("✅ Created workspace:", String(created.id), `(${workspaceName})`)
  return String(created.id)
}

async function upsertDepartment(workspaceId, name) {
  // Try common unique patterns: (workspaceId, name) or fallback findFirst.
  const existing = await prisma.orgDepartment
    .findFirst({ where: { workspaceId, name }, select: { id: true, name: true } })
    .catch(() => null)
  if (existing?.id) return existing

  const created = await prisma.orgDepartment.create({
    data: { workspaceId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertTeam(workspaceId, departmentId, name) {
  const existing = await prisma.orgTeam
    .findFirst({ where: { workspaceId, departmentId, name }, select: { id: true, name: true } })
    .catch(() => null)
  if (existing?.id) return existing

  const created = await prisma.orgTeam.create({
    data: { workspaceId, departmentId, name },
    select: { id: true, name: true },
  })
  return created
}

async function upsertUser(workspaceId, u) {
  // Some schemas do not store workspaceId on User. We do best-effort:
  // 1) try find by email; 2) create with minimal required fields; 3) if workspace link table exists, try to link.
  const email = String(u.email || "").toLowerCase().trim()
  if (!email) throw new Error("User email required in seed data.")

  let existing = await prisma.user
    .findFirst({ where: { email }, select: { id: true, email: true, name: true } })
    .catch(() => null)

  if (!existing?.id) {
    // Adjust fields below if your User model requires different columns (e.g. firstName/lastName).
    existing = await prisma.user.create({
      data: {
        email,
        name: u.name,
      },
      select: { id: true, email: true, name: true },
    })
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: u.name },
    }).catch(() => null)
  }

  // Optional: if you have a workspace membership table, link the user to workspace.
  // Common names: workspaceMember, workspaceMembership, userWorkspace, etc.
  // We attempt a couple of likely ones safely.
  const userId = String(existing.id)
  await (async () => {
    try {
      if (prisma.workspaceMember) {
        await prisma.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId, userId } },
          update: {},
          create: { workspaceId, userId, role: "MEMBER" },
        })
      }
    } catch {}
    try {
      if (prisma.workspaceMembership) {
        await prisma.workspaceMembership.upsert({
          where: { workspaceId_userId: { workspaceId, userId } },
          update: {},
          create: { workspaceId, userId },
        })
      }
    } catch {}
  })()

  return { id: userId, email }
}

/**
 * Optional helpers (guarded)
 */
async function tryUpsertDomain(workspaceId, name) {
  try {
    if (!prisma.orgDomain && !prisma.domain) return null
    const client = prisma.orgDomain ? prisma.orgDomain : prisma.domain
    const existing = await client.findFirst({ where: { workspaceId, name }, select: { id: true, name: true } })
    if (existing?.id) return existing
    return await client.create({ data: { workspaceId, name }, select: { id: true, name: true } })
  } catch {
    return null
  }
}

async function tryUpsertSystem(workspaceId, name) {
  try {
    if (!prisma.orgSystem && !prisma.systemEntity) return null
    const client = prisma.orgSystem ? prisma.orgSystem : prisma.systemEntity
    const existing = await client.findFirst({ where: { workspaceId, name }, select: { id: true, name: true } })
    if (existing?.id) return existing
    return await client.create({ data: { workspaceId, name }, select: { id: true, name: true } })
  } catch {
    return null
  }
}

async function trySetOwnership(workspaceId, entityType, entityId, ownerUserId) {
  try {
    const client = prisma.ownerAssignment || prisma.orgOwnerAssignment || null
    if (!client) return
    await client.deleteMany({ where: { workspaceId, entityType, entityId } })
    await client.create({
      data: { workspaceId, entityType, entityId, userId: ownerUserId, isPrimary: true },
    })
  } catch {}
}

async function trySetAvailability(workspaceId, userId, status, reason) {
  try {
    const client = prisma.userAvailability || prisma.personAvailability || null
    if (!client) return
    // Prefer upsert composite if exists; fallback to delete/create.
    try {
      await client.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        update: { status, reason: reason || null },
        create: { workspaceId, userId, status, reason: reason || null },
      })
    } catch {
      await client.deleteMany({ where: { workspaceId, userId } })
      await client.create({ data: { workspaceId, userId, status, reason: reason || null } })
    }
  } catch {}
}

async function trySetCapacity(workspaceId, userId, fte, shrinkagePct, allocationPct) {
  try {
    const client = prisma.userCapacity || prisma.personCapacity || null
    if (!client) return
    try {
      await client.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        update: { fte, shrinkagePct, allocationPct },
        create: { workspaceId, userId, fte, shrinkagePct, allocationPct },
      })
    } catch {
      await client.deleteMany({ where: { workspaceId, userId } })
      await client.create({ data: { workspaceId, userId, fte, shrinkagePct, allocationPct } })
    }
  } catch {}
}

async function trySetSkills(workspaceId, userId, skills) {
  // If you have a userSkill / personSkill table, seed it. Otherwise ignore.
  try {
    const client = prisma.userSkill || prisma.personSkill || null
    if (!client) return
    await client.deleteMany({ where: { workspaceId, userId } })
    const cleaned = uniq(skills.map((s) => String(s || "").trim().toLowerCase())).slice(0, 50)
    if (!cleaned.length) return
    await client.createMany({
      data: cleaned.map((skill) => ({ workspaceId, userId, skill })),
      skipDuplicates: true,
    })
  } catch {}
}

async function trySetRoles(workspaceId, userId, roles) {
  // If you have a userRoleAssignment / personRoleAssignment, seed it. Otherwise ignore.
  try {
    const client = prisma.userRoleAssignment || prisma.personRoleAssignment || null
    if (!client) return
    await client.deleteMany({ where: { workspaceId, userId } })
    const cleaned = roles
      .map((r) => ({ role: String(r.role || "").trim(), percent: Math.round(Number(r.percent || 100)) }))
      .filter((r) => r.role && r.percent > 0 && r.percent <= 200)
      .slice(0, 10)
    if (!cleaned.length) return
    await client.createMany({
      data: cleaned.map((r) => ({ workspaceId, userId, role: r.role, percent: r.percent })),
      skipDuplicates: true,
    })
  } catch {}
}

async function main() {
  const workspaceId = await getTargetWorkspaceId()
  console.log("Seeding Loopwell mock org into workspaceId:", workspaceId)

  // Departments (required for OrgTeam)
  const deptNames = ["Product", "Engineering", "Compliance", "Operations", "Data & Risk", "Leadership"]
  const depts = {}
  for (const name of deptNames) depts[name] = await upsertDepartment(workspaceId, name)

  // Teams (workspace-scoped, departmentId required)
  const teamPlan = [
    { dept: "Product", name: "Product" },
    { dept: "Engineering", name: "Engineering" },
    { dept: "Engineering", name: "Platform" },
    { dept: "Engineering", name: "Payments" },
    { dept: "Engineering", name: "Internal Tools" },
    { dept: "Compliance", name: "Compliance & FinCrime" },
    { dept: "Operations", name: "Operations" },
    { dept: "Data & Risk", name: "Data & Risk" },
    { dept: "Leadership", name: "Leadership / G&A" },
  ]
  const teams = {}
  for (const t of teamPlan) {
    const dept = depts[t.dept]
    teams[t.name] = await upsertTeam(workspaceId, dept.id, t.name)
  }

  // Optional: Domains and Systems (best-effort)
  const domainNames = ["Payments", "Customer Verification", "Fraud Detection", "Case Management", "Reporting & Analytics"]
  const systemNames = [
    "Core Payments API",
    "KYC Vendor Integration",
    "Fraud Rules Engine",
    "Case Tool",
    "Data Warehouse",
    "Internal Admin Tool",
    "Monitoring & Alerts",
  ]
  const domains = {}
  for (const name of domainNames) domains[name] = await tryUpsertDomain(workspaceId, name)
  const systems = {}
  for (const name of systemNames) systems[name] = await tryUpsertSystem(workspaceId, name)

  // Users (45) — do NOT assume membership model exists
  const usersSeed = [
    // Leadership (3)
    { name: "Marta Kalda", email: "marta.kalda@loopwell.mock" },
    { name: "Rainer Tamm", email: "rainer.tamm@loopwell.mock" },
    { name: "Liis Saar", email: "liis.saar@loopwell.mock" },

    // Product (4)
    { name: "Eva Kask", email: "eva.kask@loopwell.mock" },
    { name: "Marko Ilves", email: "marko.ilves@loopwell.mock" },
    { name: "Kertu Pohl", email: "kertu.pohl@loopwell.mock" },
    { name: "Jonas Muld", email: "jonas.muld@loopwell.mock" },

    // Engineering (15)
    { name: "Kristjan Lepp", email: "kristjan.lepp@loopwell.mock" },
    { name: "Sofia Vaher", email: "sofia.vaher@loopwell.mock" },
    { name: "Andres Pruul", email: "andres.pruul@loopwell.mock" },
    { name: "Nikita Orlov", email: "nikita.orlov@loopwell.mock" },
    { name: "Helena Kivi", email: "helena.kivi@loopwell.mock" },
    { name: "Taavi Mets", email: "taavi.mets@loopwell.mock" },
    { name: "Oskar Juur", email: "oskar.juur@loopwell.mock" },
    { name: "Anni Ruut", email: "anni.ruut@loopwell.mock" },
    { name: "Priit Koppel", email: "priit.koppel@loopwell.mock" },
    { name: "Grete Jogi", email: "grete.jogi@loopwell.mock" },
    { name: "Mihkel Kask", email: "mihkel.kask@loopwell.mock" },
    { name: "Daria Volkova", email: "daria.volkova@loopwell.mock" },
    { name: "Roman Petrov", email: "roman.petrov@loopwell.mock" },
    { name: "Karin Laas", email: "karin.laas@loopwell.mock" },
    { name: "Sander Oja", email: "sander.oja@loopwell.mock" },

    // Compliance (10)
    { name: "Aleksei Sokolov", email: "aleksei.sokolov@loopwell.mock" },
    { name: "Maarja Uibo", email: "maarja.uibo@loopwell.mock" },
    { name: "Kadi Sild", email: "kadi.sild@loopwell.mock" },
    { name: "Sergei Ivanov", email: "sergei.ivanov@loopwell.mock" },
    { name: "Annika Vool", email: "annika.vool@loopwell.mock" },
    { name: "Maria Laan", email: "maria.laan@loopwell.mock" },
    { name: "Denis Smirnov", email: "denis.smirnov@loopwell.mock" },
    { name: "Ksenia Morozova", email: "ksenia.morozova@loopwell.mock" },
    { name: "Jelena Kuznetsova", email: "jelena.kuznetsova@loopwell.mock" },
    { name: "Paul Raud", email: "paul.raud@loopwell.mock" },

    // Ops (8)
    { name: "Kadri Magi", email: "kadri.magi@loopwell.mock" },
    { name: "Risto Kuus", email: "risto.kuus@loopwell.mock" },
    { name: "Elina Parts", email: "elina.parts@loopwell.mock" },
    { name: "Marek Pihlak", email: "marek.pihlak@loopwell.mock" },
    { name: "Silvia Noor", email: "silvia.noor@loopwell.mock" },
    { name: "Lauri Roos", email: "lauri.roos@loopwell.mock" },
    { name: "Egle Hunt", email: "egle.hunt@loopwell.mock" },
    { name: "Vlad Mironov", email: "vlad.mironov@loopwell.mock" },

    // Data & Risk (5)
    { name: "Kristi Teder", email: "kristi.teder@loopwell.mock" },
    { name: "Artem Pavlov", email: "artem.pavlov@loopwell.mock" },
    { name: "Hanna Veskimagi", email: "hanna.veskimagi@loopwell.mock" },
    { name: "Igor Belov", email: "igor.belov@loopwell.mock" },
    { name: "Karl Sein", email: "karl.sein@loopwell.mock" },
  ]

  const userIdByEmail = {}
  for (const u of usersSeed) {
    const row = await upsertUser(workspaceId, u)
    userIdByEmail[u.email.toLowerCase()] = row.id
  }

  // Optional: availability + capacity + skills + roles (best-effort; depends on schema tables)
  const AV = { AVAILABLE: "AVAILABLE", LIMITED: "LIMITED", UNAVAILABLE: "UNAVAILABLE" }

  const availabilityPlan = [
    ["marta.kalda@loopwell.mock", AV.LIMITED, "Exec priorities"],
    ["rainer.tamm@loopwell.mock", AV.LIMITED, "Operational load"],
    ["liis.saar@loopwell.mock", AV.LIMITED, "Hiring cycle"],
    ["eva.kask@loopwell.mock", AV.LIMITED, "Roadmap delivery"],
    ["marko.ilves@loopwell.mock", AV.LIMITED, "Discovery + execution"],
    ["jonas.muld@loopwell.mock", AV.LIMITED, "Shared across teams"],
    ["helena.kivi@loopwell.mock", AV.UNAVAILABLE, "On leave (2 weeks)"],
    ["andres.pruul@loopwell.mock", AV.LIMITED, "On-call rotation"],
    ["oskar.juur@loopwell.mock", AV.LIMITED, "Incident follow-ups"],
    ["aleksei.sokolov@loopwell.mock", AV.LIMITED, "Regulatory deadline"],
    ["sergei.ivanov@loopwell.mock", AV.LIMITED, "Case backlog"],
    ["annika.vool@loopwell.mock", AV.LIMITED, "Case backlog"],
    ["kadri.magi@loopwell.mock", AV.LIMITED, "Peak workload"],
    ["karl.sein@loopwell.mock", AV.LIMITED, "Pipeline maintenance"],
  ]
  for (const [email, status, reason] of availabilityPlan) {
    const uid = userIdByEmail[String(email).toLowerCase()]
    await trySetAvailability(workspaceId, uid, status, reason)
  }

  const capacityPlan = [
    ["eva.kask@loopwell.mock", 1.0, 20, 125],
    ["marko.ilves@loopwell.mock", 1.0, 20, 120],
    ["kristjan.lepp@loopwell.mock", 1.0, 25, 115],
    ["sofia.vaher@loopwell.mock", 1.0, 20, 105],
    ["andres.pruul@loopwell.mock", 1.0, 20, 110],
    ["helena.kivi@loopwell.mock", 1.0, 20, 90],
    ["oskar.juur@loopwell.mock", 1.0, 20, 120],
    ["aleksei.sokolov@loopwell.mock", 1.0, 35, 110],
    ["sergei.ivanov@loopwell.mock", 1.0, 40, 115],
    ["kadri.magi@loopwell.mock", 1.0, 30, 105],
    ["karl.sein@loopwell.mock", 1.0, 20, 115],
    ["kristi.teder@loopwell.mock", 1.0, 15, 85],
  ]
  for (const [email, fte, shrinkagePct, allocationPct] of capacityPlan) {
    const uid = userIdByEmail[String(email).toLowerCase()]
    await trySetCapacity(workspaceId, uid, fte, shrinkagePct, allocationPct)
  }

  const roleSkillPlan = [
    ["marta.kalda@loopwell.mock", [{ role: "CEO", percent: 100 }], ["strategy","stakeholder management","incident response"]],
    ["rainer.tamm@loopwell.mock", [{ role: "COO", percent: 100 }], ["operations","process design","incident response"]],
    ["liis.saar@loopwell.mock", [{ role: "Head of People", percent: 100 }], ["people ops","hiring","performance management"]],
    ["eva.kask@loopwell.mock", [{ role: "Senior Product Manager", percent: 100 }], ["product","payments knowledge","stakeholder management"]],
    ["marko.ilves@loopwell.mock", [{ role: "Product Manager", percent: 100 }], ["product","fraud detection","requirements"]],
    ["kertu.pohl@loopwell.mock", [{ role: "Designer", percent: 100 }], ["design","ux","research"]],
    ["jonas.muld@loopwell.mock", [{ role: "UX Researcher", percent: 100 }], ["research","ux","customer interviews"]],
    ["kristjan.lepp@loopwell.mock", [{ role: "Engineering Manager", percent: 100 }], ["incident response","platform","leadership"]],
    ["sofia.vaher@loopwell.mock", [{ role: "Engineering Manager", percent: 100 }], ["payments knowledge","vendor integrations","delivery"]],
    ["andres.pruul@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["node","sql","payments knowledge"]],
    ["helena.kivi@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["vendor integrations","monitoring","incident response"]],
    ["oskar.juur@loopwell.mock", [{ role: "Senior Engineer", percent: 100 }], ["rule tuning","fraud detection","node"]],
    ["aleksei.sokolov@loopwell.mock", [{ role: "Head of Compliance", percent: 100 }], ["compliance","regulatory reporting","incident response"]],
    ["sergei.ivanov@loopwell.mock", [{ role: "FinCrime Analyst", percent: 100 }], ["investigations","sanctions screening","risk"]],
    ["jelena.kuznetsova@loopwell.mock", [{ role: "QA Specialist", percent: 100 }], ["qa","risk","process design"]],
    ["kadri.magi@loopwell.mock", [{ role: "Operations Manager", percent: 100 }], ["operations","process design","incident response"]],
    ["karl.sein@loopwell.mock", [{ role: "Data Engineer", percent: 100 }], ["etl","data modeling","sql"]],
  ]
  for (const [email, roles, skills] of roleSkillPlan) {
    const uid = userIdByEmail[String(email).toLowerCase()]
    await trySetRoles(workspaceId, uid, roles)
    await trySetSkills(workspaceId, uid, skills)
  }

  // Optional: Ownership (intentional gaps)
  // - Fraud Detection domain unowned
  // - Fraud Rules Engine + Internal Admin Tool unowned
  // Only runs if an ownership table exists.
  await trySetOwnership(workspaceId, "TEAM", teams["Product"].id, userIdByEmail["eva.kask@loopwell.mock"])
  await trySetOwnership(workspaceId, "TEAM", teams["Engineering"].id, userIdByEmail["kristjan.lepp@loopwell.mock"])
  await trySetOwnership(workspaceId, "TEAM", teams["Compliance & FinCrime"].id, userIdByEmail["aleksei.sokolov@loopwell.mock"])
  await trySetOwnership(workspaceId, "TEAM", teams["Operations"].id, userIdByEmail["kadri.magi@loopwell.mock"])
  await trySetOwnership(workspaceId, "TEAM", teams["Data & Risk"].id, userIdByEmail["karl.sein@loopwell.mock"])
  await trySetOwnership(workspaceId, "TEAM", teams["Leadership / G&A"].id, userIdByEmail["marta.kalda@loopwell.mock"])

  if (domains["Payments"]) await trySetOwnership(workspaceId, "DOMAIN", domains["Payments"].id, userIdByEmail["sofia.vaher@loopwell.mock"])
  if (domains["Customer Verification"]) await trySetOwnership(workspaceId, "DOMAIN", domains["Customer Verification"].id, userIdByEmail["maarja.uibo@loopwell.mock"])
  // skip Fraud Detection (unowned)
  if (domains["Case Management"]) await trySetOwnership(workspaceId, "DOMAIN", domains["Case Management"].id, userIdByEmail["roman.petrov@loopwell.mock"])
  if (domains["Reporting & Analytics"]) await trySetOwnership(workspaceId, "DOMAIN", domains["Reporting & Analytics"].id, userIdByEmail["karl.sein@loopwell.mock"])

  if (systems["Core Payments API"]) await trySetOwnership(workspaceId, "SYSTEM", systems["Core Payments API"].id, userIdByEmail["andres.pruul@loopwell.mock"])
  if (systems["KYC Vendor Integration"]) await trySetOwnership(workspaceId, "SYSTEM", systems["KYC Vendor Integration"].id, userIdByEmail["helena.kivi@loopwell.mock"])
  // skip Fraud Rules Engine (unowned)
  if (systems["Case Tool"]) await trySetOwnership(workspaceId, "SYSTEM", systems["Case Tool"].id, userIdByEmail["maria.laan@loopwell.mock"])
  if (systems["Data Warehouse"]) await trySetOwnership(workspaceId, "SYSTEM", systems["Data Warehouse"].id, userIdByEmail["karl.sein@loopwell.mock"])
  // skip Internal Admin Tool (unowned)
  if (systems["Monitoring & Alerts"]) await trySetOwnership(workspaceId, "SYSTEM", systems["Monitoring & Alerts"].id, userIdByEmail["priit.koppel@loopwell.mock"])

  console.log("✅ Loopwell mock org seeded successfully.")
  console.log("Tip: re-run with WORKSPACE_ID=<id> to target a specific workspace.")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

