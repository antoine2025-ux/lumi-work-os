import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireActiveOrgId } from "@/server/org/context";
import { getLatestOrgHealth } from "@/server/org/health/store";
import { refreshOrgHealth } from "@/server/org/health/refresh";

type HealthSignal = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  contextType: string | null;
  contextId: string | null;
  contextLabel: string | null;
  href: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req);

    const latest = await getLatestOrgHealth(orgId);
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
        signals: latest.signals.map((s: HealthSignal) => ({
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
  const computed = await refreshOrgHealth(orgId);
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

} catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req);
    const computed = await refreshOrgHealth(orgId);

    return NextResponse.json({
      ok: true,
      snapshot: {
        ...computed.snapshot,
        capturedAt: computed.snapshot.capturedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
