import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { acceptOrgInvitationByToken } from "@/server/data/acceptOrgInvitation";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : null;

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    const result = await acceptOrgInvitationByToken(token, auth.user.userId, {
      sessionEmail: auth.user.email,
      sessionName: auth.user.name,
    });

    return NextResponse.json(
      {
        workspace: result.workspace,
        membershipCreated: result.membershipCreated,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to accept invitation.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

