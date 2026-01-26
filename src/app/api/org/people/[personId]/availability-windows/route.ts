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
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = ["AVAILABLE", "UNAVAILABLE", "PARTIAL"] as const;
const ALLOWED_REASONS = [
  "VACATION",
  "SICK_LEAVE",
  "PARENTAL_LEAVE",
  "SABBATICAL",
  "JURY_DUTY",
  "BEREAVEMENT",
  "TRAINING",
  "OTHER",
] as const;

type AvailabilityType = typeof ALLOWED_TYPES[number];
type AvailabilityReason = typeof ALLOWED_REASONS[number];

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
    console.error("[GET /api/org/people/[personId]/availability-windows] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const body = await request.json();

    // Validate required fields
    if (!body.startDate) {
      return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    }

    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
    }

    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
    }

    // Validate startDate < endDate
    if (endDate && startDate >= endDate) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    // Validate type
    const type = (body.type as AvailabilityType) || "UNAVAILABLE";
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate fraction
    const fraction = body.fraction !== undefined ? Number(body.fraction) : null;
    if (fraction !== null && (isNaN(fraction) || fraction < 0 || fraction > 1)) {
      return NextResponse.json({ error: "fraction must be between 0 and 1" }, { status: 400 });
    }

    // Validate reason
    const reason = body.reason as AvailabilityReason | undefined;
    if (reason && !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${ALLOWED_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate expectedReturnDate
    const expectedReturnDate = body.expectedReturnDate
      ? new Date(body.expectedReturnDate)
      : null;
    if (expectedReturnDate && isNaN(expectedReturnDate.getTime())) {
      return NextResponse.json({ error: "Invalid expectedReturnDate format" }, { status: 400 });
    }
    if (expectedReturnDate && expectedReturnDate < startDate) {
      return NextResponse.json(
        { error: "expectedReturnDate must be on or after startDate" },
        { status: 400 }
      );
    }

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
    const prismaError = error as any;
    
    console.error("[POST /api/org/people/[personId]/availability-windows] Error:", error);
    
    // Provide more specific error message for Prisma validation errors
    if (prismaError?.code === 'P2003' || prismaError?.code === 'P2025') {
      return NextResponse.json({ 
        error: "Database constraint violation", 
        details: prismaError?.meta || prismaError?.message 
      }, { status: 400 });
    }
    
    if (prismaError?.code === 'P2002') {
      return NextResponse.json({ 
        error: "Unique constraint violation", 
        details: prismaError?.meta 
      }, { status: 409 });
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a validation error related to enum
    if (prismaError?.constructor?.name === 'PrismaClientValidationError' || errorMessage?.includes('AvailabilityType')) {
      return NextResponse.json({ 
        error: "Invalid availability type. The database may not support this value yet. Please apply pending migrations.",
        details: errorMessage,
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: errorMessage 
    }, { status: 500 });
  }
}

