import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { FeatureFlagService } from "@/lib/feature-flags"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId") || "workspace-1"
    const flags = await FeatureFlagService.getFlags(workspaceId, session.user.id)

    return NextResponse.json({ flags })
  } catch (error) {
    console.error("Error fetching feature flags:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { workspaceId, key, enabled, audience } = await request.json()

    if (!workspaceId || !key || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await FeatureFlagService.setFlag(workspaceId, key, enabled, audience)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting feature flag:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
