import { NextResponse } from "next/server";
import { buildOrgContextBundleForCurrentWorkspace } from "@/lib/loopbrain/orgContextBuilder";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/org-context-preview
 *
 * Dev-only endpoint to preview Org ContextObjects for the current workspace.
 */
export async function GET() {
  // Basic dev guard – adjust if you want a stronger check
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org context preview is not available in production." },
      { status: 404 }
    );
  }

  try {
    const bundle = await buildOrgContextBundleForCurrentWorkspace();

    return NextResponse.json(
      {
        ok: true,
        bundle,
        meta: {
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[dev/org-context-preview] Failed to build org context bundle", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build Org context bundle.",
      },
      { status: 500 }
    );
  }
}

