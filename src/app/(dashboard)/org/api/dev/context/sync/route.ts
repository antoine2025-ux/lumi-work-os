import { NextResponse } from "next/server";
import { syncOrgContextBundleToStoreForCurrentWorkspace } from "@/lib/org/org-context-store";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not available in production", { status: 403 });
    }

    const result = await syncOrgContextBundleToStoreForCurrentWorkspace();

    return NextResponse.json({
      ok: true,
      workspaceId: result.workspaceId,
      totalItems: result.totalItems,
      message: `Synced ${result.totalItems} org context items to ContextItem for workspace ${result.workspaceId}.`,
    });
  } catch (error) {
    console.error("Org context sync dev endpoint error", error);
    return new NextResponse("Failed to sync org context to store", {
      status: 500,
    });
  }
}

