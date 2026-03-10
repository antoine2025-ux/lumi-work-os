/**
 * Loopbrain Q4 API: "Do we actually have capacity to do this in the given timeframe?"
 * 
 * GET /api/loopbrain/org/q4?projectId=...&start=...&end=... (or durationDays=...)
 * POST /api/loopbrain/org/q4 (legacy, body format)
 * 
 * Query params (GET):
 * - projectId (string, required)
 * - start (ISO date string, optional, default = now)
 * - end (ISO date string, required if durationDays missing)
 * - durationDays (number, required if end missing)
 * 
 * Response: Q4Output with stable shape
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { answerQ4, type Q4Timeframe, type Q4Output } from "@/lib/loopbrain/reasoning/q4";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";
import { LoopbrainOrgQ4Schema } from "@/lib/validations/loopbrain";

async function handleRequest(request: NextRequest) {
  const auth = await getUnifiedAuth(request);
  const workspaceId = auth.workspaceId;

  // Assert workspace access
  await assertAccess({
    userId: auth.user.userId,
    workspaceId,
    scope: "workspace",
    requireRole: ["MEMBER"],
  });

  let projectId: string;
  let parsedTimeframe: Q4Timeframe | { startDate?: Date; endDate?: Date; durationWeeks?: number };

  // Support both GET (query params) and POST (body)
  if (request.method === "GET") {
    const { searchParams } = new URL(request.url);
    projectId = searchParams.get("projectId") || "";

    if (!projectId) {
      return NextResponse.json(
        {
          errors: [{ code: "MISSING_PROJECT_ID", message: "projectId is required" }],
        },
        { status: 400 }
      );
    }

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const durationDaysParam = searchParams.get("durationDays");

    const startDate = startParam ? new Date(startParam) : new Date();
    let endDate: Date | undefined;

    if (endParam) {
      endDate = new Date(endParam);
    } else if (durationDaysParam) {
      const durationDays = Number(durationDaysParam);
      if (isNaN(durationDays) || durationDays <= 0) {
        return NextResponse.json(
          {
            errors: [
              {
                code: "INVALID_DURATION",
                message: "durationDays must be a positive number",
              },
            ],
          },
          { status: 400 }
        );
      }
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
    } else {
      return NextResponse.json(
        {
          errors: [
            {
              code: "MISSING_TIMEFRAME",
              message: "Either end (ISO date) or durationDays (number) is required",
            },
          ],
        },
        { status: 400 }
      );
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          errors: [{ code: "INVALID_DATE", message: "Invalid date format. Use ISO 8601." }],
        },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          errors: [
            {
              code: "INVALID_TIMEFRAME",
              message: "end date must be after start date",
            },
          ],
        },
        { status: 400 }
      );
    }

    parsedTimeframe = { startDate, endDate };
  } else {
    // POST (legacy support)
    const body = LoopbrainOrgQ4Schema.parse(await request.json());
    projectId = body.projectId;

    parsedTimeframe = {
      startDate: body.timeframe.startDate ? new Date(body.timeframe.startDate) : undefined,
      endDate: body.timeframe.endDate ? new Date(body.timeframe.endDate) : undefined,
      durationWeeks: body.timeframe.durationWeeks,
    };
  }

  // Check if project exists
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ orgId: workspaceId }, { workspaceId }],
    },
  });

  if (!project) {
    return NextResponse.json(
      {
        errors: [{ code: "PROJECT_NOT_FOUND", message: `Project ${projectId} not found` }],
      },
      { status: 404 }
    );
  }

  // Call Q4 reasoning function
  const result = await answerQ4(projectId, workspaceId, parsedTimeframe);

  // Transform to stable response shape
  return formatQ4Response(result, parsedTimeframe);
}

function formatQ4Response(
  result: Q4Output,
  timeframe: Q4Timeframe | { startDate?: Date; endDate?: Date; durationWeeks?: number }
) {
  const startDate = timeframe.startDate instanceof Date ? timeframe.startDate : new Date(timeframe.startDate!);
  const endDate = timeframe.endDate instanceof Date ? timeframe.endDate : new Date(timeframe.endDate!);

  // Map feasibility to assessment
  const assessmentMap: Record<Q4Output["feasibility"], string> = {
    likely_feasible: "likely_feasible",
    possibly_feasible: "possibly_feasible",
    unlikely_feasible: "unlikely_feasible",
    insufficient_data: "insufficient_data",
  };

  return NextResponse.json({
    assessment: assessmentMap[result.feasibility],
    confidence: result.confidence,
    assumptions: result.assumptions.map((a) => a.description),
    capacitySummary: result.capacitySummary.qualitativeDescription,
    risks: result.risks.map((r) => r.description),
    constraints: result.assumptions
      .filter((a) => a.type === "ownership" || a.type === "capacity")
      .map((a) => a.description),
    timeframe: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    candidates: [], // Candidates available via Q3 endpoint if needed
    ...(result.refusal && {
      errors: [
        {
          code: "REFUSAL",
          message: result.refusal.reason,
        },
      ],
    }),
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleRequest(request);
  } catch (error) {
    return handleApiError(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleRequest(request);
  } catch (error) {
    return handleApiError(error, request)
  }
}

