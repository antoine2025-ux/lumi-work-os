import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors"

/**
 * GET /api/org/fix-events
 * 
 * Fetch fix events for an organization.
 * 
 * Query params:
 * - orgId: Organization ID (required)
 * - personId: Filter by person ID (optional)
 * - limit: Number of events to return (default: 10)
 * - sortBy: Sort by "impact" or "date" (default: "date")
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
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

    const workspaceId = auth.workspaceId;
    const { searchParams } = new URL(request.url);
    
    const orgId = searchParams.get("orgId") || workspaceId;
    const personId = searchParams.get("personId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sortBy = searchParams.get("sortBy") || "date";

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "orgId required" }, { status: 400 });
    }

    const where: any = { orgId };
    if (personId) {
      where.personId = personId;
    }

    const orderBy: any = sortBy === "impact" 
      ? { impactScore: "desc" }
      : { createdAt: "desc" };

    // Handle case where table doesn't exist yet (graceful degradation)
    let events: any[] = [];
    try {
      events = await prisma.orgFixEvent.findMany({
        where,
        orderBy,
        take: limit,
      });
    } catch (error: any) {
      // If table doesn't exist (P2021) or model not available, return empty array
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.warn("[fix-events] Table org_fix_events does not exist yet, returning empty array");
        return NextResponse.json({
          ok: true,
          events: [],
        });
      }
      // Re-throw other errors
      throw error;
    }

    // Enrich with person names if personId is present
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let personName: string | undefined;
        if (event.personId) {
          // Try to get person name from OrgPosition
          const position = await prisma.orgPosition.findFirst({
            where: {
              workspaceId: orgId,
              userId: event.personId,
            },
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          });
          personName = position?.user?.name || undefined;
        }

        return {
          id: event.id,
          orgId: event.orgId,
          personId: event.personId,
          personName,
          fixType: event.fixType,
          impactScore: event.impactScore,
          createdAt: event.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      ok: true,
      events: enrichedEvents,
    });
  } catch (error) {
    return handleApiError(error, request)
  }
}

/**
 * POST /api/org/fix-events
 * 
 * Create a new fix event.
 * 
 * Body:
 * - orgId: Organization ID (required)
 * - personId: Person ID (optional)
 * - fixType: Type of fix (required)
 * - beforeState: Before state JSON (required)
 * - afterState: After state JSON (required)
 * - impactScore: Impact score (required)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
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

    const workspaceId = auth.workspaceId;
    const body = await request.json();

    const {
      orgId = workspaceId,
      personId,
      fixType,
      beforeState,
      afterState,
      impactScore,
    } = body;

    if (!orgId || !fixType || !beforeState || !afterState || typeof impactScore !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle case where table doesn't exist yet (graceful degradation)
    let event: any;
    try {
      event = await prisma.orgFixEvent.create({
        data: {
          orgId,
          personId: personId || null,
          fixType,
          beforeState,
          afterState,
          impactScore,
        },
      });
    } catch (error: any) {
      // If table doesn't exist (P2021) or model not available, return success but no-op
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.warn("[fix-events] Table org_fix_events does not exist yet, skipping create");
        return NextResponse.json({
          ok: true,
          event: null,
          message: "Fix events table not available yet",
        });
      }
      // Re-throw other errors
      throw error;
    }

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        orgId: event.orgId,
        personId: event.personId,
        fixType: event.fixType,
        impactScore: event.impactScore,
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, request)
  }
}

