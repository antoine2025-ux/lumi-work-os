import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { CompleteOrgOnboardingSchema } from '@/lib/validations/org';

/**
 * POST /api/org/onboarding/complete
 *
 * Sets orgCenterOnboardingCompletedAt on the workspace.
 * Idempotent: if already set, returns ok without overwriting.
 * Auth: ADMIN / OWNER only.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    // Parse body (optional fields for tracking)
    const body = CompleteOrgOnboardingSchema.parse(await req.json().catch(() => ({})));

    if (!prisma) {
      return NextResponse.json(
        { error: "Database not available." },
        { status: 500 }
      );
    }

    // Idempotent: if already set, return ok without overwriting the timestamp
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { orgCenterOnboardingCompletedAt: true },
    });

    if (workspace?.orgCenterOnboardingCompletedAt) {
      return NextResponse.json({ ok: true, alreadyCompleted: true }, { status: 200 });
    }

    await prisma.workspace.update({
      where: { id: auth.workspaceId },
      data: { orgCenterOnboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}

