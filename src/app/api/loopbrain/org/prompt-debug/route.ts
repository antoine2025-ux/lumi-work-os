import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";

export async function GET(request: NextRequest) {
  try {
    const preamble = await buildOrgSummaryPreambleForCurrentWorkspace(
      {
        maxPerType: 10,
      },
      request
    );

    return NextResponse.json({
      ok: true,
      orgPreamble: preamble,
    });
  } catch (error) {
    console.error("Loopbrain Org prompt-debug error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build Org prompt preamble",
      },
      { status: 500 }
    );
  }
}

