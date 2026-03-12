import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";

// Soft-fail fallback — header.tsx depends on this never throwing
const FALLBACK = { ok: true, role: null, canEdit: false } as const;

function mapRole(role: string): { role: string; canEdit: boolean } {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return { role: "ADMIN", canEdit: true };
    case "MEMBER":
    case "VIEWER":
    default:
      return { role: "VIEWER", canEdit: false };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);

    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ ...FALLBACK, hint: "Authentication required." }, { status: 200 });
    }

    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.userId },
      select: { role: true },
    });

    if (!member) {
      return NextResponse.json({ ...FALLBACK, noOrgMembership: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true, ...mapRole(member.role) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load permissions.";
    console.error("[GET /api/org/permissions] Error:", error);
    return NextResponse.json({ ...FALLBACK, hint: message }, { status: 200 });
  }
}
