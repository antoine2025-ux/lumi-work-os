import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/org/current-org";

export async function GET() {
  try {
    const org = await getCurrentOrg();
    
    // Return format expected by useCurrentOrg hook
    return NextResponse.json({ 
      ok: true, 
      data: {
        org: org ? { id: org.id, name: org.id } : null, // Temporary: use id as name
        currentMemberRole: null // TODO: Implement role checking
      }
    });
  } catch (error: any) {
    console.error("Error getting current org:", error);
    return NextResponse.json(
      { ok: false, error: { message: error.message || "Failed to get current org" } },
      { status: 500 }
    );
  }
}
