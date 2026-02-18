import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getLatestOrgHealth } from "@/server/org/health/store";
import { refreshOrgHealth } from "@/server/org/health/refresh";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const latest = await getLatestOrgHealth(workspaceId);
    if (latest) {
      return NextResponse.json({
        snapshot: {
          capacityScore: latest.snapshot.capacityScore ?? undefined,
          ownershipScore: latest.snapshot.ownershipScore ?? undefined,
          balanceScore: latest.snapshot.balanceScore ?? undefined,
          managementScore: latest.snapshot.managementScore ?? undefined,
          dataQualityScore: latest.snapshot.dataQualityScore ?? undefined,
          capturedAt: latest.snapshot.capturedAt.toISOString(),
        },
        signals: latest.signals.map((s) => ({
          id: s.id,
          type: s.type,
          severity: s.severity,
          title: s.title,
          description: s.description,
          createdAt: s.createdAt.toISOString(),
          resolvedAt: s.resolvedAt ? s.resolvedAt.toISOString() : null,
          contextType: s.contextType,
          contextId: s.contextId,
          contextLabel: s.contextLabel,
          href: s.href,
        })),
      });
    }

    // No snapshot yet: compute + store first snapshot
    const computed = await refreshOrgHealth(workspaceId);
    return NextResponse.json({
      snapshot: {
        ...computed.snapshot,
        capturedAt: computed.snapshot.capturedAt.toISOString(),
      },
      signals: computed.signals.map((s) => ({
        id: `sig_${s.type}_${s.severity}`,
        ...s,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      })),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const computed = await refreshOrgHealth(workspaceId);

    return NextResponse.json({
      ok: true,
      snapshot: {
        ...computed.snapshot,
        capturedAt: computed.snapshot.capturedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
