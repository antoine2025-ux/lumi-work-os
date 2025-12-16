import { NextResponse } from "next/server";
import { runOrgContextHealthChecks } from "@/lib/loopbrain/orgContextHealth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-context-health
 *
 * Dev-only endpoint returning Org → Loopbrain context health report.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org context health checks are not available in production." },
      { status: 404 }
    );
  }

  try {
    const report = await runOrgContextHealthChecks();

    return NextResponse.json(
      {
        ok: true,
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[dev/org-context-health] Failed to compute health report", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to compute Org context health report.",
      },
      { status: 500 }
    );
  }
}

