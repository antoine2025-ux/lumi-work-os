import { NextResponse } from "next/server";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";

export async function GET() {
  const context = await getOrgPermissionContext();
  if (!context) return NextResponse.json({ preferences: {} });

  const membership = await (prisma as any).workspaceMember.findFirst({
    where: { workspaceId: context.orgId, userId: context.userId },
    select: { preferences: true },
  });

  return NextResponse.json({
    preferences: (membership?.preferences as Record<string, any>) ?? {},
  });
}

