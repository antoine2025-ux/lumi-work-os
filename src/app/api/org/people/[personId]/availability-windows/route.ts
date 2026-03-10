/**
 * GET/POST /api/org/people/[personId]/availability-windows
 * List and create availability windows for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { CreateAvailabilityWindowSchema } from "@/lib/validations/org";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get the user ID from position
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Fetch availability windows
    const windows = await prisma.personAvailability.findMany({
      where: {
        workspaceId,
        personId: position.userId,
      },
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      windows: windows.map((w) => ({
        id: w.id,
        type: w.type,
        startDate: w.startDate.toISOString(),
        endDate: w.endDate?.toISOString() ?? null,
        fraction: w.fraction,
        reason: w.reason,
        expectedReturnDate: w.expectedReturnDate?.toISOString() ?? null,
        note: w.note,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get the user ID from position first (needed for validation)
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Parse and validate request body
    const body = CreateAvailabilityWindowSchema.parse(await request.json());

    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const type = body.type;
    const fraction = body.fraction ?? null;
    const reason = body.reason ?? null;
    const expectedReturnDate = body.expectedReturnDate
      ? new Date(body.expectedReturnDate)
      : null;

    // Step 6: Create the availability window
    const created = await prisma.personAvailability.create({
      data: {
        workspaceId,
        personId: position.userId,
        type: type as "AVAILABLE" | "UNAVAILABLE" | "PARTIAL",
        startDate,
        endDate,
        fraction,
        reason: reason ?? null,
        expectedReturnDate,
        note: body.note ?? null,
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      window: {
        id: created.id,
        type: created.type,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate?.toISOString() ?? null,
        fraction: created.fraction,
        reason: created.reason,
        expectedReturnDate: created.expectedReturnDate?.toISOString() ?? null,
        note: created.note,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

