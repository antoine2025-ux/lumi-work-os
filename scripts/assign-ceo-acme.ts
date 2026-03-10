/**
 * Assign am@loopwell.io as CEO and Sarah Chen as Executive Assistant in Acme workspace.
 *
 * Run: npx tsx scripts/assign-ceo-acme.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const workspaceSlug = process.env.ACME_SLUG || "acme-analytics";

  const workspace = await prisma.workspace.findFirst({
    where: { slug: { in: [workspaceSlug, "acme-analytics", "acme"] } },
  });
  if (!workspace) {
    throw new Error(
      `Acme workspace not found (tried: ${workspaceSlug}, acme-analytics, acme). Run db:seed:acme first.`
    );
  }
  const wId = workspace.id;

  const antoine = await prisma.user.findUnique({
    where: { email: "am@loopwell.io" },
  });
  if (!antoine) {
    throw new Error(
      "User am@loopwell.io not found. Ensure you're signed up with that email."
    );
  }

  const sarah = await prisma.user.findUnique({
    where: { email: "sarah.chen@acme-analytics.com" },
  });
  if (!sarah) {
    throw new Error(
      "Sarah Chen (sarah.chen@acme-analytics.com) not found. Run db:seed:acme first."
    );
  }

  const ceoPosId = "acme-pos-sarah-chen";
  const leadershipTeamId = "acme-team-leadership";

  await prisma.$transaction(async (tx) => {
    // 1. Workspace owner
    await tx.workspace.update({
      where: { id: wId },
      data: { ownerId: antoine.id },
    });

    // 2. Workspace members: Antoine OWNER, Sarah MEMBER
    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: wId, userId: antoine.id },
      },
      update: { role: "OWNER" },
      create: {
        workspaceId: wId,
        userId: antoine.id,
        role: "OWNER",
      },
    });
    await tx.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId: wId, userId: sarah.id },
      },
      data: { role: "MEMBER" },
    });

    // 3. CEO position: assign to Antoine
    await tx.orgPosition.update({
      where: { id: ceoPosId },
      data: { userId: antoine.id },
    });

    // 4. Sarah's new position: Executive Assistant, reports to CEO
    await tx.orgPosition.upsert({
      where: { id: "acme-pos-sarah-chen-ea" },
      update: {
        userId: sarah.id,
        title: "Executive Assistant",
        parentId: ceoPosId,
        teamId: leadershipTeamId,
      },
      create: {
        id: "acme-pos-sarah-chen-ea",
        workspaceId: wId,
        userId: sarah.id,
        title: "Executive Assistant",
        parentId: ceoPosId,
        teamId: leadershipTeamId,
        level: 3,
        order: 0,
        isActive: true,
        startDate: new Date(2024, 0, 15),
        employmentType: "full-time",
        timezone: "America/Los_Angeles",
      },
    });

    // 5. Leadership team leader
    await tx.orgTeam.update({
      where: { id: leadershipTeamId },
      data: { leaderId: antoine.id },
    });

    // 6. PersonManagerLinks: everyone who reported to Sarah now reports to Antoine
    const sarahReports = await tx.personManagerLink.findMany({
      where: { workspaceId: wId, managerId: sarah.id },
    });
    for (const link of sarahReports) {
      await tx.personManagerLink.update({
        where: {
          workspaceId_personId_managerId: {
            workspaceId: wId,
            personId: link.personId,
            managerId: sarah.id,
          },
        },
        data: { managerId: antoine.id },
      });
    }

    // 7. Add Sarah -> Antoine (Executive Assistant reports to CEO)
    await tx.personManagerLink.upsert({
      where: {
        workspaceId_personId_managerId: {
          workspaceId: wId,
          personId: sarah.id,
          managerId: antoine.id,
        },
      },
      update: {},
      create: {
        workspaceId: wId,
        personId: sarah.id,
        managerId: antoine.id,
        startsAt: new Date(),
      },
    });
  });

  console.log("✅ Done:");
  console.log("   - am@loopwell.io (Antoine Morlet) is now CEO and workspace owner");
  console.log("   - Sarah Chen is now Executive Assistant (reports to CEO)");
  console.log("   - Leadership team leader updated");
  console.log("   - Manager links updated");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
