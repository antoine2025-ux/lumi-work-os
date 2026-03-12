/**
 * Loopbrain Integration Test: Full Pipeline (Q1, Q3, Q4, Q5, Q9)
 *
 * Seeds a realistic workspace via real Prisma operations and exercises
 * five Loopbrain reasoning pipelines end-to-end against that data.
 *
 * Prerequisites: a reachable test database at DATABASE_URL with the schema
 * applied (same DB that `tests/setup.ts` points to).
 *
 * Run individually:
 *   npm run test -- src/tests/loopbrain/integration/full-pipeline.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { answerQ1 } from "@/lib/loopbrain/q1";
import { answerQ3 } from "@/lib/loopbrain/reasoning/q3";
import { answerQ4 } from "@/lib/loopbrain/reasoning/q4";
import { answerQ5 } from "@/lib/loopbrain/q5";
import { answerQ9 } from "@/lib/loopbrain/q9";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK: @/lib/db — real Prisma client for integration testing
//
// tests/setup.ts overwrites process.env.DATABASE_URL with a fake URL
// (postgresql://test:test@localhost:5432/test_db) designed for unit tests
// that mock Prisma entirely.  This integration test seeds and queries a real
// database, so we must bypass that override.
//
// The factory reads DATABASE_URL directly from .env.local (or .env as fallback)
// off the filesystem, which is unaffected by process.env mutations.
//
// vi.mock is auto-hoisted by Vitest before any imports are resolved, so this
// mock is in place before either tests/setup.ts or the pipeline modules touch
// the module cache.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("@/lib/db", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");

  function readDbUrl(file: string): string | null {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), "utf-8");
      // Handle both quoted and unquoted values:  DATABASE_URL="..."  or  DATABASE_URL=...
      const m = raw.match(/^DATABASE_URL="?([^"\n]+?)"?\s*$/m);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  const dbUrl = readDbUrl(".env.local") ?? readDbUrl(".env") ?? "";
  const realPrisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  return { prisma: realPrisma, prismaUnscoped: realPrisma };
});

// Mock OpenAI so no accidental live API calls fire during tests.
// Q1-Q9 are deterministic and do not call the model directly,
// but downstream utilities might import it.
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "mock" } }],
        }),
      },
    };
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test-run identifier — keeps records isolated across parallel/repeated runs
// ─────────────────────────────────────────────────────────────────────────────
const RUN_ID = Date.now().toString(36);

// ─────────────────────────────────────────────────────────────────────────────
// Shared state — populated by beforeAll, used in tests
// ─────────────────────────────────────────────────────────────────────────────
let workspaceId: string;
let aliceId: string;
let bobId: string;
let carolId: string;
let daveId: string;
let eveId: string;
let kateId: string;
let projAId: string; // Platform Redesign — Alice is owner
let projBId: string; // API Gateway      — Bob is owner
let projCId: string; // Brand Refresh     — Kate is owner

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
const now = new Date();

function daysFromNow(n: number): Date {
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
}

/** Next occurrence of ISO weekday (1=Mon … 7=Sun), always ≥ 1 day away */
function nextWeekday(iso: 1 | 2 | 3 | 4 | 5 | 6 | 7): Date {
  const d = new Date(now);
  const jsDay = iso % 7; // JS: 0=Sun,1=Mon,...,6=Sat
  const diff = (jsDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const twoDaysAgo = daysFromNow(-2);
const thirtyDaysAgo = daysFromNow(-30);
const tomorrow = daysFromNow(1);
const fourWeeksOut = daysFromNow(28);
const nextMonday = nextWeekday(1);
// nextFriday must be the Friday of the *same* work week as nextMonday, not the
// nearest upcoming Friday from today.  On Thursdays/Fridays, nextWeekday(5)
// returns a date BEFORE nextWeekday(1), making the [nextMonday, nextFriday]
// availability window invalid (end < start).  Deriving from nextMonday avoids
// this ordering bug regardless of which day of the week the test runs.
const nextFriday = new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000);
const nextTuesday = new Date(nextMonday.getTime() + 24 * 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // ── 1. Users ──────────────────────────────────────────────────────────────
  const names = [
    { key: "owner",  name: "Test Owner"  },
    { key: "alice",  name: "Alice Chen"  },
    { key: "bob",    name: "Bob Kim"     },
    { key: "carol",  name: "Carol Davis" },
    { key: "dave",   name: "Dave Park"   },
    { key: "eve",    name: "Eve Sharma"  },
    { key: "frank",  name: "Frank Lee"   },
    { key: "grace",  name: "Grace Wu"    },
    { key: "henry",  name: "Henry Osei"  },
    { key: "isabel", name: "Isabel Costa"},
    { key: "jack",   name: "Jack Novak"  },
    { key: "kate",   name: "Kate Miller" },
    { key: "liam",   name: "Liam Torres" },
  ] as const;

  const users: Record<string, { id: string }> = {};
  for (const { key, name } of names) {
    users[key] = await prisma.user.create({
      data: { name, email: `${key}-${RUN_ID}@loopbrain-test.invalid` },
    });
  }

  aliceId  = users.alice.id;
  bobId    = users.bob.id;
  carolId  = users.carol.id;
  daveId   = users.dave.id;
  eveId    = users.eve.id;
  kateId   = users.kate.id;

  // ── 2. Workspace ──────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      name:    `Loopbrain Test ${RUN_ID}`,
      slug:    `lb-test-${RUN_ID}`,
      ownerId: users.owner.id,
    },
  });
  workspaceId = workspace.id;

  // ── 3. Org (id = workspaceId so Role.orgId = workspaceId satisfies FK) ───
  // Q3's fetchRolesWithResponsibilities does: prisma.role.findMany({ where: { orgId: workspaceId } })
  // Role.orgId → Org.id, so we need Org.id = workspaceId.
  await prisma.org.create({
    data: { id: workspaceId, name: `Loopbrain Test Org ${RUN_ID}` },
  });

  // ── 4. WorkspaceMembers ───────────────────────────────────────────────────
  await prisma.workspaceMember.createMany({
    data: names.map(({ key }) => ({
      workspaceId,
      userId: users[key].id,
      role: key === "owner" ? "OWNER" : "MEMBER",
    })),
  });

  // ── 5. Departments ────────────────────────────────────────────────────────
  const [engDept, productDept, designDept] = await Promise.all([
    prisma.orgDepartment.create({ data: { workspaceId, name: "Engineering" } }),
    prisma.orgDepartment.create({ data: { workspaceId, name: "Product"     } }),
    prisma.orgDepartment.create({ data: { workspaceId, name: "Design"      } }),
  ]);

  // ── 6. Teams ──────────────────────────────────────────────────────────────
  const [platformTeam, infraTeam, productTeam, uxTeam, mobileTeam] =
    await Promise.all([
      prisma.orgTeam.create({ data: { workspaceId, departmentId: engDept.id,     name: "Platform"       } }),
      prisma.orgTeam.create({ data: { workspaceId, departmentId: engDept.id,     name: "Infrastructure" } }),
      prisma.orgTeam.create({ data: { workspaceId, departmentId: productDept.id, name: "Product"        } }),
      prisma.orgTeam.create({ data: { workspaceId, departmentId: designDept.id,  name: "UX"             } }),
      prisma.orgTeam.create({ data: { workspaceId, departmentId: engDept.id,     name: "Mobile"         } }),
    ]);

  // ── 7. OrgPositions (isActive:true → Q3 picks them up via orgPositions.some) ─
  await prisma.orgPosition.createMany({
    data: [
      { workspaceId, userId: aliceId,          title: "Senior Engineer",  teamId: platformTeam.id, isActive: true },
      { workspaceId, userId: bobId,            title: "Product Manager",  teamId: productTeam.id,  isActive: true },
      { workspaceId, userId: carolId,          title: "Designer",         teamId: uxTeam.id,       isActive: true },
      { workspaceId, userId: daveId,           title: "Engineer",         teamId: platformTeam.id, isActive: true },
      { workspaceId, userId: eveId,            title: "Engineer",         teamId: infraTeam.id,    isActive: true },
      { workspaceId, userId: users.frank.id,   title: "Engineer",         teamId: mobileTeam.id,   isActive: true },
      { workspaceId, userId: users.grace.id,   title: "Senior Designer",  teamId: uxTeam.id,       isActive: true },
      { workspaceId, userId: users.henry.id,   title: "Product Manager",  teamId: productTeam.id,  isActive: true },
      { workspaceId, userId: users.isabel.id,  title: "Engineer",         teamId: infraTeam.id,    isActive: true },
      { workspaceId, userId: users.jack.id,    title: "Senior Engineer",  teamId: platformTeam.id, isActive: true },
      { workspaceId, userId: kateId,           title: "Brand Lead",       teamId: uxTeam.id,       isActive: true },
      { workspaceId, userId: users.liam.id,    title: "Engineer",         teamId: mobileTeam.id,   isActive: true },
    ],
  });

  // ── 8. Roles (orgId = workspaceId, no responsibilities) ──────────────────
  // Roles with no responsibilities → executionScopes.length === 0
  // → buildInitialCandidatePool treats hasMatch = true for every role holder
  // → all 12 people become candidates for any project (broad pool for testing)
  await prisma.role.createMany({
    data: [
      "Senior Engineer",
      "Product Manager",
      "Designer",
      "Engineer",
      "Brand Lead",
      "Senior Designer",
    ].map((name) => ({ workspaceId, name })),
  });

  // ── 8.5. Create default space for projects ────────────────────────────────
  const testSpace = await prisma.space.create({
    data: {
      workspaceId,
      name: "General",
      description: "Default space for test projects",
      icon: "🏢",
      color: "#6B7280",
      ownerId: users.owner.id,
    },
  });

  // ── 9. Projects ─────────────────────────────────────────────────────────────
  const [projA, projB, projC] = await Promise.all([
    prisma.project.create({
      data: {
        workspaceId,
        name: "Platform Redesign",
        description: "Redesign core platform services for scalability and reliability",
        createdById: users.owner.id,
        spaceId: testSpace.id,
      },
    }),
    prisma.project.create({
      data: {
        workspaceId,
        name: "API Gateway",
        description: "Build a unified API gateway for all internal services",
        createdById: users.owner.id,
        spaceId: testSpace.id,
      },
    }),
    prisma.project.create({
      data: {
        workspaceId,
        name: "Brand Refresh",
        description: "Refresh the company visual identity and brand guidelines",
        createdById: users.owner.id,
        spaceId: testSpace.id,
      },
    }),
  ]);
  projAId = projA.id;
  projBId = projB.id;
  projCId = projC.id;

  // ── 10. ProjectAccountabilities ───────────────────────────────────────────
  await prisma.projectAccountability.createMany({
    data: [
      { projectId: projAId, workspaceId, ownerPersonId: aliceId }, // Alice owns ProjA
      { projectId: projBId, workspaceId, ownerPersonId: bobId   }, // Bob   owns ProjB
      { projectId: projCId, workspaceId, ownerPersonId: kateId  }, // Kate  owns ProjC
    ],
  });

  // ── 11. ProjectAllocations ────────────────────────────────────────────────
  //
  // Alice capacity math (key assertion):
  //   Active allocs at `now`:   0.5 (ProjA) + 0.3 (ProjB) = 0.8
  //   effectiveCapacity         = 1.0 − 0.8 = 0.2   ← via sumAllocationFraction (time-filtered)
  //
  //   ALL allocs (no date filter): 0.5 + 0.3 + 0.5(ProjC, ended 2 days ago) = 1.3
  //   isOverallocated             = 1.3 > 1.0 = true  ← via applyAllocationSanity (sum all)
  //
  await prisma.projectAllocation.createMany({
    data: [
      // Alice — active (ProjA + ProjB) + past (ProjC, endDate = twoDaysAgo)
      { workspaceId, projectId: projAId, personId: aliceId, fraction: 0.5, startDate: thirtyDaysAgo },
      { workspaceId, projectId: projBId, personId: aliceId, fraction: 0.3, startDate: thirtyDaysAgo },
      { workspaceId, projectId: projCId, personId: aliceId, fraction: 0.5, startDate: thirtyDaysAgo, endDate: twoDaysAgo },
      // Carol — active (ProjA)
      { workspaceId, projectId: projAId, personId: carolId, fraction: 0.6, startDate: thirtyDaysAgo },
      // Bob — active (ProjB)
      { workspaceId, projectId: projBId, personId: bobId,   fraction: 0.3, startDate: thirtyDaysAgo },
    ],
  });

  // ── 12. PersonAvailability ────────────────────────────────────────────────
  //
  // Dave:  UNAVAILABLE next Monday → next Friday
  //   • Q3 at=now  → window not yet active → Dave appears AVAILABLE (included as candidate)
  //   • Q5 at=nextTuesday → window active  → Dave appears UNAVAILABLE (key assertion)
  //
  // Eve:   PARTIAL 0.5, open-ended, started 30 days ago (active now)
  //
  await prisma.personAvailability.createMany({
    data: [
      {
        workspaceId,
        personId:  daveId,
        type:      "UNAVAILABLE",
        startDate: nextMonday,
        endDate:   nextFriday,
      },
      {
        workspaceId,
        personId:  eveId,
        type:      "PARTIAL",
        fraction:  0.5,
        startDate: thirtyDaysAgo,
        // no endDate → open-ended partial availability
      },
    ],
  });

  // ── 13. CapacityContracts (one per person, 40 h/week) ────────────────────
  await prisma.capacityContract.createMany({
    data: [
      aliceId, bobId, carolId, daveId, eveId,
      users.frank.id, users.grace.id, users.henry.id,
      users.isabel.id, users.jack.id, kateId, users.liam.id,
    ].map((personId) => ({
      workspaceId,
      personId,
      weeklyCapacityHours: 40,
      effectiveFrom: thirtyDaysAgo,
    })),
  });

  // ── 14. PersonManagerLinks ────────────────────────────────────────────────
  await prisma.personManagerLink.createMany({
    data: [
      { workspaceId, personId: daveId,          managerId: aliceId },
      { workspaceId, personId: eveId,           managerId: aliceId },
      { workspaceId, personId: carolId,         managerId: kateId  },
      { workspaceId, personId: users.frank.id,  managerId: bobId   },
      { workspaceId, personId: users.grace.id,  managerId: kateId  },
      { workspaceId, personId: users.henry.id,  managerId: bobId   },
      { workspaceId, personId: users.isabel.id, managerId: aliceId },
      { workspaceId, personId: users.jack.id,   managerId: aliceId },
    ],
  });
}, /* timeout */ 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────
afterAll(async () => {
  if (!workspaceId) return;

  // PersonManagerLink has workspaceId but may not cascade; delete explicitly.
  await prisma.personManagerLink.deleteMany({ where: { workspaceId } }).catch(() => {});

  // Workspace deletion cascades:
  //   OrgDepartment → OrgTeam → OrgPosition
  //   Project → ProjectAccountability / ProjectAllocation
  //   PersonAvailability, CapacityContract, WorkspaceMember, etc.
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});

  // Org is not workspace-scoped (separate FK tree); delete after workspace.
  // This cascades Roles and RoleResponsibilities.
  await prisma.org.delete({ where: { id: workspaceId } }).catch(() => {});

  // Users are not workspace-scoped; clean up by email pattern.
  await prisma.user.deleteMany({
    where: { email: { contains: `${RUN_ID}@loopbrain-test.invalid` } },
  }).catch(() => {});

  await prisma.$disconnect();
}, /* timeout */ 30_000);

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe("Loopbrain Full Pipeline — Integration", () => {

  // ── Q1: Who owns this? ────────────────────────────────────────────────────
  describe("Q1 — Ownership", () => {
    it("identifies Alice as the owner of Platform Redesign with high confidence", async () => {
      const projA = await prisma.project.findUniqueOrThrow({
        where: { id: projAId },
        include: { accountability: true },
      });

      const q1 = await answerQ1({
        project: projA,
        peopleById: { [aliceId]: { name: "Alice Chen" } },
      });

      expect(q1.questionId).toBe("Q1");
      expect(q1.confidence).toBe("high");
      expect(q1.constraints).toHaveLength(0);
      expect(q1.owner.type).toBe("person");
      if (q1.owner.type === "person") {
        expect(q1.owner.personId).toBe(aliceId);
        expect(q1.owner.name).toBe("Alice Chen");
      }
    });

    it("returns unset ownership and low confidence for a project with no accountability", async () => {
      const q1 = await answerQ1({ project: { accountability: null } });

      expect(q1.owner.type).toBe("unset");
      expect(q1.confidence).toBe("low");
      expect(q1.constraints).toContain("Owner not defined in Org");
    });
  });

  // ── Q3: Who should be working on this right now? ──────────────────────────
  describe("Q3 — Candidate identification (Platform Redesign)", () => {
    it("returns at least one viable candidate", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      expect(q3.viableCandidates.length).toBeGreaterThan(0);
    });

    it("includes Alice in the viable candidates", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      const alice = q3.viableCandidates.find((c) => c.personId === aliceId);
      expect(alice).toBeDefined();
    });

    it("reports Alice's effectiveCapacity ≈ 0.2 (active allocs: 0.5 + 0.3 = 0.8)", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      const alice = q3.viableCandidates.find((c) => c.personId === aliceId);
      expect(alice).toBeDefined();
      // deriveEffectiveCapacity uses time-filtered sumAllocationFraction:
      //   1.0 − (0.5 active ProjA + 0.3 active ProjB) = 0.2
      //   Past ProjC alloc (endDate = twoDaysAgo) is excluded from the active sum.
      expect(alice!.effectiveCapacity).toBeCloseTo(0.2, 1);
    });

    it("flags Alice as overallocated (all-time alloc sum: 0.5+0.3+0.5 = 1.3 > 1.0)", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      const alice = q3.viableCandidates.find((c) => c.personId === aliceId);
      expect(alice).toBeDefined();
      // applyAllocationSanity sums ALL fractions (no date filter):
      //   0.5 (ProjA) + 0.3 (ProjB) + 0.5 (ProjC, ended) = 1.3 → overallocated
      expect(alice!.isOverallocated).toBe(true);
    });

    it("returns confidence medium or high (roles are defined in the catalog)", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      // roleCount > 0 → determineConfidence won't return "low"
      expect(["medium", "high"]).toContain(q3.confidence);
    });

    it("marks Alice as the project owner", async () => {
      const q3 = await answerQ3(projAId, workspaceId);

      const alice = q3.viableCandidates.find((c) => c.personId === aliceId);
      expect(alice?.isOwner).toBe(true);
    });
  });

  // ── Q4: Do we have capacity for this in the given timeframe? ─────────────
  describe("Q4 — Feasibility (Platform Redesign, 4-week window)", () => {
    async function runQ4() {
      return answerQ4(projAId, workspaceId, {
        startDate:     tomorrow,
        endDate:       fourWeeksOut,
        durationWeeks: 4,
      });
    }

    it("returns a structurally valid Q4Output", async () => {
      const q4 = await runQ4();

      expect(q4.feasibility).toMatch(
        /^(likely_feasible|possibly_feasible|unlikely_feasible|insufficient_data)$/
      );
      expect(q4.capacitySummary).toBeDefined();
      expect(Array.isArray(q4.risks)).toBe(true);
      expect(Array.isArray(q4.assumptions)).toBe(true);
    });

    it("surfaces at least one risk (Alice is overallocated)", async () => {
      const q4 = await runQ4();

      // Alice's isOverallocated = true in Q3 → Q4 should propagate an overallocation risk
      expect(q4.risks.length).toBeGreaterThan(0);
    });

    it("does not short-circuit to insufficient_data (Q3 has roles and candidates)", async () => {
      const q4 = await runQ4();

      // Q3 confidence is medium/high because roles exist → Q4 can compute feasibility
      expect(q4.feasibility).not.toBe("insufficient_data");
    });
  });

  // ── Q5: Who is unavailable, and when do they return? ─────────────────────
  describe("Q5 — Availability (Dave Park)", () => {
    const daveAvailability = () => [
      {
        type:      "UNAVAILABLE" as const,
        startDate: nextMonday,
        endDate:   nextFriday,
      },
    ];

    it("reports Dave as unavailable when assessed mid-next-week", async () => {
      const q5 = await answerQ5({
        person:       { id: daveId, name: "Dave Park" },
        availability: daveAvailability(),
        at:           nextTuesday, // inside the [nextMonday, nextFriday] window
      });

      expect(q5.questionId).toBe("Q5");
      expect(q5.personId).toBe(daveId);
      expect(q5.currentStatus).toBe("unavailable");
      expect(q5.confidence).toBe("high"); // availability data is present
    });

    it("includes the return date (next Friday ISO string)", async () => {
      const q5 = await answerQ5({
        person:       { id: daveId, name: "Dave Park" },
        availability: daveAvailability(),
        at:           nextTuesday,
      });

      expect(q5.returnDate).toBeDefined();
      expect(q5.returnDate).toBe(nextFriday.toISOString());
    });

    it("reports Dave as available when assessed before the window opens", async () => {
      const q5 = await answerQ5({
        person:       { id: daveId, name: "Dave Park" },
        availability: daveAvailability(),
        at:           now, // before nextMonday → window not yet active
      });

      expect(q5.currentStatus).toBe("available");
      expect(q5.returnDate).toBeUndefined();
      expect(q5.activeWindows).toHaveLength(0);
    });

    it("returns low confidence for a person with no availability records", async () => {
      const q5 = await answerQ5({
        person:       { id: daveId, name: "Dave Park" },
        availability: [],
        at:           now,
      });

      expect(q5.currentStatus).toBe("available");
      expect(q5.confidence).toBe("low");
    });
  });

  // ── Q9: Should we proceed, reassign, delay, or request support? ─────────
  describe("Q9 — Decision framing (Platform Redesign)", () => {
    async function buildQ9Args() {
      const projA = await prisma.project.findUniqueOrThrow({
        where: { id: projAId },
        include: { accountability: true },
      });

      return {
        projectId:   projAId,
        workspaceId,
        project:     projA,
        peopleById: {
          [aliceId]: { name: "Alice Chen"  },
          [bobId]:   { name: "Bob Kim"    },
          [carolId]: { name: "Carol Davis" },
          [kateId]:  { name: "Kate Miller" },
        },
        rolesByName: {
          "Senior Engineer": { name: "Senior Engineer", responsibilities: [] as { scope: string; target: string }[] },
          "Product Manager": { name: "Product Manager", responsibilities: [] as { scope: string; target: string }[] },
          "Designer":        { name: "Designer",        responsibilities: [] as { scope: string; target: string }[] },
          "Engineer":        { name: "Engineer",        responsibilities: [] as { scope: string; target: string }[] },
          "Brand Lead":      { name: "Brand Lead",      responsibilities: [] as { scope: string; target: string }[] },
        },
      };
    }

    it("returns exactly 4 decision options", async () => {
      const args = await buildQ9Args();
      const q9 = await answerQ9(args);

      expect(q9.questionId).toBe("Q9");
      expect(q9.options).toHaveLength(4);
    });

    it("reports ownership as 'set' (Alice is the project owner)", async () => {
      const args = await buildQ9Args();
      const q9 = await answerQ9(args);

      expect(q9.evidence.ownership).toBe("set");
    });

    it("returns a structured decision with action and explanation", async () => {
      const args = await buildQ9Args();
      const q9 = await answerQ9(args);

      expect(q9.decision).toBeDefined();
      expect(typeof q9.decision.action).toBe("string");
      expect(Array.isArray(q9.decision.explanation)).toBe(true);
      expect(q9.decision.explanation.length).toBeGreaterThan(0);
    });

    it("returns a valid confidence level", async () => {
      const args = await buildQ9Args();
      const q9 = await answerQ9(args);

      expect(["high", "medium", "low"]).toContain(q9.confidence);
    });

    it("each option has action, title, and rationale fields", async () => {
      const args = await buildQ9Args();
      const q9 = await answerQ9(args);

      for (const opt of q9.options) {
        expect(typeof opt.action).toBe("string");
        expect(typeof opt.title).toBe("string");
        expect(Array.isArray(opt.rationale)).toBe(true);
      }
    });
  });
});
