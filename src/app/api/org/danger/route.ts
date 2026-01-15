import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";

export async function DELETE(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:org:delete");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "You are not allowed to delete this org.",
          },
        },
        { status }
      );
    }

    const orgId = context!.orgId;

    if (!prisma) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Database connection unavailable.",
          },
        },
        { status: 500 }
      );
    }

    // Optional: require confirmation in body
    // const body = await req.json().catch(() => ({}));
    // if (body.confirm !== "DELETE") {
    //   return NextResponse.json(
    //     {
    //       ok: false,
    //       error: {
    //         code: "CONFIRMATION_REQUIRED",
    //         message: "Confirmation required. Send { confirm: 'DELETE' } in the request body.",
    //       },
    //     },
    //     { status: 400 }
    //   );
    // }

    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Organization not found.",
          },
        },
        { status: 404 }
      );
    }

    // Delete workspace (cascade will handle related data via Prisma relations)
    await prisma.workspace.delete({
      where: { id: orgId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/org/danger] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong while deleting this org.",
        },
      },
      { status: 500 }
    );
  }
}

