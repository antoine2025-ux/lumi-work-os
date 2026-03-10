import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { DismissDuplicateSchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const body = DismissDuplicateSchema.parse(await req.json());

    const updated = await prisma.orgDuplicateCandidate.update({
      where: { id: body.id },
      data: { status: "DISMISSED" },
    });

    return NextResponse.json({ ok: true, candidate: updated });
  } catch (error) {
    return handleApiError(error, req);
  }
}
