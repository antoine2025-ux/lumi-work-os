import { NextResponse } from "next/server";
import { syncOrgContextBundleToContextStore } from "@/lib/loopbrain/orgContextPersistence";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/org-context-sync
 *
 * Dev-only endpoint to sync Org ContextObjects into ContextItem.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org context sync is not available in production." },
      { status: 404 }
    );
  }

  try {
    const result = await syncOrgContextBundleToContextStore();

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[dev/org-context-sync] Failed to sync org context bundle", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to sync Org context bundle to ContextItem.",
      },
      { status: 500 }
    );
  }
}

