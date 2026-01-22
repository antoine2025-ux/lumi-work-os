import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrgContext(req);
    if (!ctx.user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    const { orgId } = ctx;
    if (!orgId) return NextResponse.json({ ok: false, error: "No organization membership", noOrgMembership: true }, { status: 403 });

    const key = `org:${orgId}:audit`;
    const rows = await unstable_cache(
      async () => {
        return await prisma.auditLogEntry.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
      },
      [key],
      { tags: [key], revalidate: 60 }
    )();

    return NextResponse.json({ ok: true, entries: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to load audit", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;
    const ctx = await getOrgContext(req);
    if (!ctx.user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    const { user, orgId } = ctx;
    if (!orgId) return NextResponse.json({ ok: false, error: "No organization membership", noOrgMembership: true }, { status: 403 });

    const action = body?.action;
    const targetCount = body?.targetCount;
    const summary = body?.summary;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ ok: false, error: "action is required" }, { status: 400 });
    }
    if (typeof targetCount !== "number") {
      return NextResponse.json({ ok: false, error: "targetCount is required" }, { status: 400 });
    }
    if (!summary || typeof summary !== "string") {
      return NextResponse.json({ ok: false, error: "summary is required" }, { status: 400 });
    }

    const created = await prisma.auditLogEntry.create({
      data: {
        orgId,
        actorUserId: user?.id ?? null,
        actorLabel: user?.name || user?.email || "Unknown user",
        action,
        targetCount,
        summary,
      },
    });

    revalidateTag(`org:${orgId}:audit`);

    return NextResponse.json({ ok: true, entry: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to write audit", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
