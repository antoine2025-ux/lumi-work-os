import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getProfilePermissions } from "@/lib/org/permissions/profile-permissions";

const schema = z.object({
  startDate: z.string().nullable().optional(),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "intern"])
    .nullable()
    .optional(),
  location: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getUnifiedAuth(request);
    const { id } = await params;
    const workspaceId = auth.workspaceId ?? "";

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(auth.workspaceId ?? null);

    const body = await request.json();
    const validated = schema.parse(body);

    const position = await prisma.orgPosition.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 },
      );
    }

    if (!position.userId) {
      return NextResponse.json(
        { error: "Position has no assigned user" },
        { status: 403 },
      );
    }

    const permissions = await getProfilePermissions(
      auth.user.userId,
      position.userId,
      workspaceId
    );

    const updates: Record<string, unknown> = {};

    if (validated.startDate !== undefined) {
      if (!permissions.canEditField("startDate")) {
        return NextResponse.json(
          { error: "You do not have permission to edit start date" },
          { status: 403 },
        );
      }
      updates.startDate = validated.startDate
        ? new Date(validated.startDate)
        : null;
    }

    if (validated.employmentType !== undefined) {
      if (!permissions.canEditField("employmentType")) {
        return NextResponse.json(
          { error: "You do not have permission to edit employment type" },
          { status: 403 },
        );
      }
      updates.employmentType = validated.employmentType;
    }

    if (validated.location !== undefined) {
      if (!permissions.canEditField("location")) {
        return NextResponse.json(
          { error: "You do not have permission to edit location" },
          { status: 403 },
        );
      }
      updates.location = validated.location;
    }

    if (validated.timezone !== undefined) {
      if (!permissions.canEditField("timezone")) {
        return NextResponse.json(
          { error: "You do not have permission to edit timezone" },
          { status: 403 },
        );
      }
      updates.timezone = validated.timezone;
    }

    const updated = await prisma.orgPosition.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ position: updated });
  } catch (error) {
    return handleApiError(error, request);
  }
}
