import { NextResponse } from "next/server";
import { buildOrgContextBundleForCurrentWorkspace } from "@/lib/org/org-context-service";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not available in production", { status: 403 });
    }

    const bundle = await buildOrgContextBundleForCurrentWorkspace();

    return NextResponse.json({
      ok: true,
      workspaceOrg: {
        root: bundle.root,
        items: bundle.items,
        count: bundle.items.length,
      },
    });
  } catch (error) {
    console.error("Org context dev endpoint error", error);
    return new NextResponse("Failed to build org context bundle", {
      status: 500,
    });
  }
}

