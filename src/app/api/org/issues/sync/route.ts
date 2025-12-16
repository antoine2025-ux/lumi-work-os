import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  // Get all org positions (people) for this workspace with team and title info (exclude archived)
  const positions = await prisma.orgPosition.findMany({
    where: { workspaceId, isActive: true, archivedAt: null },
    select: {
      id: true,
      parentId: true,
      title: true,
      teamId: true,
      team: {
        select: { id: true, name: true },
      },
    },
  });

  const now = new Date();

  // Missing manager issues: upsert + set lastSeenAt; resolve for fixed.
  const missingManager = new Set(positions.filter((p) => !p.parentId).map((p) => p.id));

  // Upsert missing manager issues
  for (const id of missingManager) {
    await prisma.orgPersonIssue.upsert({
      where: { orgId_personId_type: { orgId: ctx.orgId, personId: id, type: "MISSING_MANAGER" } },
      update: { lastSeenAt: now, resolvedAt: null },
      create: {
        orgId: ctx.orgId,
        personId: id,
        type: "MISSING_MANAGER",
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
  }

  // Resolve missing manager issues no longer missing
  await prisma.orgPersonIssue.updateMany({
    where: {
      orgId: ctx.orgId,
      type: "MISSING_MANAGER",
      resolvedAt: null,
      personId: { notIn: Array.from(missingManager) },
    },
    data: { resolvedAt: now, lastSeenAt: now },
  });

  // Detect missing team
  const missingTeam = positions.filter((p) => !p.teamId && !p.team?.id).map((p) => p.id);
  for (const id of missingTeam) {
    await prisma.orgPersonIssue.upsert({
      where: { orgId_personId_type: { orgId: ctx.orgId, personId: id, type: "MISSING_TEAM" } },
      update: { lastSeenAt: now, resolvedAt: null },
      create: {
        orgId: ctx.orgId,
        personId: id,
        type: "MISSING_TEAM",
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
  }

  // Detect missing role/title
  const missingRole = positions.filter((p) => !p.title || p.title.trim() === "").map((p) => p.id);
  for (const id of missingRole) {
    await prisma.orgPersonIssue.upsert({
      where: { orgId_personId_type: { orgId: ctx.orgId, personId: id, type: "MISSING_ROLE" } },
      update: { lastSeenAt: now, resolvedAt: null },
      create: {
        orgId: ctx.orgId,
        personId: id,
        type: "MISSING_ROLE",
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
  }

  // Resolve fixed issues generically
  await prisma.orgPersonIssue.updateMany({
    where: {
      orgId: ctx.orgId,
      resolvedAt: null,
      OR: [
        { type: "MISSING_TEAM", personId: { notIn: missingTeam } },
        { type: "MISSING_ROLE", personId: { notIn: missingRole } },
      ],
    },
    data: { resolvedAt: now, lastSeenAt: now },
  });

  return NextResponse.json({
    ok: true,
    missingCount: missingManager.size,
    missingTeamCount: missingTeam.length,
    missingRoleCount: missingRole.length,
  });
}

