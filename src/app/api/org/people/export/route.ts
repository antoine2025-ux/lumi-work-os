/**
 * GET /api/org/people/export
 * Export people directory as CSV.
 * ADMIN+ only. Returns RFC 4180 compliant CSV.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { unauthorizedResponse } from "@/lib/api/errors";
import { listOrgPeople } from "@/server/org/people/read";

function csvEscape(value: string | number | null | undefined): string {
  const s = (value ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_HEADERS = [
  "Name",
  "Email",
  "Title",
  "Department",
  "Team",
  "Role",
  "Status",
  "Manager",
  "Phone",
  "Location",
  "Start Date",
  "Capacity (hours/week)",
];

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return unauthorizedResponse("Authentication required. Please log in.");
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN"],
    });
    setWorkspaceContext(workspaceId);

    const { people } = await listOrgPeople(workspaceId);
    const userIds = people.map((p) => p.userId);

    // Batch fetch extended data
    const [positions, users, workspaceMembers, roleAssignments, capacityContracts] =
      await Promise.all([
        prisma.orgPosition.findMany({
          where: {
            workspaceId,
            userId: { in: userIds },
            isActive: true,
          },
          select: {
            userId: true,
            startDate: true,
            location: true,
          },
        }),
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, phone: true, location: true },
        }),
        prisma.workspaceMember.findMany({
          where: {
            workspaceId,
            userId: { in: userIds },
          },
          select: { userId: true, joinedAt: true },
        }),
        // PersonRoleAssignment uses orgId; in workspace-based org, orgId = workspaceId
        prisma.personRoleAssignment
          .findMany({
            where: {
              workspaceId,
              personId: { in: userIds },
            },
            select: { personId: true, role: true, percent: true },
            orderBy: { percent: "desc" },
          })
          .catch(() => [] as Array<{ personId: string; role: string; percent: number }>),
        prisma.capacityContract.findMany({
          where: {
            workspaceId,
            personId: { in: userIds },
            effectiveFrom: { lte: new Date() },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
          },
          select: { personId: true, weeklyCapacityHours: true },
          orderBy: { effectiveFrom: "desc" },
        }),
      ]);

    const positionByUser = new Map(positions.map((p) => [p.userId, p]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const memberByUser = new Map(workspaceMembers.map((m) => [m.userId, m]));

    const roleByUser = new Map<string, string>();
    for (const r of roleAssignments) {
      if (!roleByUser.has(r.personId)) {
        roleByUser.set(r.personId, r.role);
      }
    }

    const capacityByUser = new Map(
      capacityContracts.map((c) => [c.personId, c.weeklyCapacityHours])
    );

    const lines: string[] = [CSV_HEADERS.map(csvEscape).join(",")];

    for (const person of people) {
      const pos = positionByUser.get(person.userId);
      const user = userById.get(person.userId);
      const member = memberByUser.get(person.userId);

      const startDate = pos?.startDate ?? member?.joinedAt;
      const startDateStr = startDate
        ? startDate.toISOString().split("T")[0]
        : "";
      const location = pos?.location ?? user?.location ?? "";
      const phone = user?.phone ?? "";
      const role = roleByUser.get(person.userId) ?? person.title ?? "";
      const capacity = capacityByUser.get(person.userId);

      const row = [
        person.fullName,
        person.email ?? "",
        person.title ?? "",
        person.department?.name ?? "",
        person.team?.name ?? "",
        role,
        person.availabilityStatus,
        person.manager?.fullName ?? "",
        phone,
        location,
        startDateStr,
        capacity !== undefined ? String(capacity) : "",
      ];
      lines.push(row.map(csvEscape).join(","));
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `people-export-${dateStr}.csv`;

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
