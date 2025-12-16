import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const orgId = ctx.orgId;
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "No organization membership" },
        { status: 403 }
      );
    }

    const { id: personId } = await params;
    const body = await request.json();

    const { projectId, fraction, startDate, endDate, note } = body;

    if (!projectId || !startDate || fraction === undefined) {
      return NextResponse.json(
        { ok: false, error: "projectId, startDate, and fraction are required" },
        { status: 400 }
      );
    }

    if (fraction < 0 || fraction > 1) {
      return NextResponse.json(
        { ok: false, error: "Fraction must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Verify person exists
    const person = await prisma.user.findUnique({
      where: { id: personId },
      select: { id: true },
    });

    if (!person) {
      return NextResponse.json(
        { ok: false, error: "Person not found" },
        { status: 404 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, orgId: true },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Use project's orgId or fallback to context orgId
    const allocationOrgId = project.orgId || orgId;

    const allocation = await prisma.projectAllocation.create({
      data: {
        orgId: allocationOrgId,
        projectId,
        personId,
        fraction,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        note: note || null,
      },
    });

    return NextResponse.json({ ok: true, allocation });
  } catch (error) {
    console.error("Failed to create allocation:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create allocation" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { id: personId } = await params;

    const allocations = await prisma.projectAllocation.findMany({
      where: {
        personId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      allocations: allocations.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        projectName: a.project.name,
        fraction: a.fraction,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        note: a.note ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch allocations:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch allocations" },
      { status: 500 }
    );
  }
}

