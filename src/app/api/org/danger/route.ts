import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function DELETE(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["OWNER"] });
    setWorkspaceContext(workspaceId);

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
      where: { id: workspaceId },
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
      where: { id: workspaceId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
