/**
 * Loopbrain Q5 API: "Who is unavailable, and when do they return?"
 * 
 * GET /api/loopbrain/q5?personId=...&at=... (at is optional ISO date)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { answerQ5 } from "@/lib/loopbrain/q5";
import { handleApiError } from "@/lib/api-errors"

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId;

    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });
    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");
    const atParam = searchParams.get("at"); // optional ISO

    if (!personId) {
      return NextResponse.json(
        {
          questionId: "Q5",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "MISSING_PERSON_ID", message: "personId is required" }],
          personId: "",
          currentStatus: "available" as const,
          activeWindows: [],
        },
        { status: 400 }
      );
    }

    // Fetch person (User model)
    const person = await prisma.user.findFirst({
      where: {
        id: personId,
        orgPositions: {
          some: {
            workspaceId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!person) {
      return NextResponse.json(
        {
          questionId: "Q5",
          assumptions: [],
          constraints: [],
          risks: [],
          confidence: "low",
          errors: [{ code: "PERSON_NOT_FOUND", message: "Person not found" }],
          personId,
          currentStatus: "available" as const,
          activeWindows: [],
        },
        { status: 404 }
      );
    }

    // Fetch availability windows
    const availability = await prisma.personAvailability.findMany({
      where: { personId },
      orderBy: { startDate: "desc" },
    });

    const at = atParam ? new Date(atParam) : new Date();

    const resp = await answerQ5({
      person,
      availability: availability
        .filter((a): a is typeof a & { type: "UNAVAILABLE" | "PARTIAL" } =>
          a.type === "UNAVAILABLE" || a.type === "PARTIAL"
        )
        .map((a) => ({
          type: a.type,
          startDate: a.startDate,
          endDate: a.endDate,
          fraction: a.fraction,
          note: a.note,
        })),
      at,
    });

    return NextResponse.json(resp);
  } catch (error) {
    return handleApiError(error, request)
  }
}

