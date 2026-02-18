import { NextRequest, NextResponse } from "next/server";
import { evaluateOrgQaQuestionsForWorkspace } from "@/lib/org/qa/evaluator";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

function isDevToolsEnabled() {
  const isProd = process.env.NODE_ENV === "production";
  const allowDev = process.env.ALLOW_DEV_LOGIN === "true";
  return !isProd || allowDev;
}

export async function GET(request: NextRequest) {
  if (!isDevToolsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const workspaceId = await getCurrentWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: "Missing workspace" },
        { status: 400 }
      );
    }

    const questions = await evaluateOrgQaQuestionsForWorkspace(workspaceId);

    return NextResponse.json(
      {
        ok: true,
        questions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Org QA smoke route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Org QA smoke tests",
      },
      { status: 500 },
    );
  }
}
