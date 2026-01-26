import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/server/rbac";

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    personId?: string;
    suggestionRunId?: string;
    confidence?: number;
    accepted?: boolean;
    partiallyApplied?: boolean;
    feedback?: string;
  };

  await prisma.loopBrainFeedback.create({
    data: {
      orgId: ctx.orgId,
      scope: "people_issues",
      personId: body.personId,
      suggestionRunId: body.suggestionRunId,
      confidence: body.confidence,
      accepted: body.accepted,
      partiallyApplied: body.partiallyApplied,
      feedback: body.feedback,
    },
  });

  return NextResponse.json({ ok: true });
}

