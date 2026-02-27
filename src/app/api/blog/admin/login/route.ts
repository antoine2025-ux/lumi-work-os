import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { handleApiError } from "@/lib/api-errors"

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER"],
    })

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    const adminPassword = process.env.BLOG_ADMIN_PASSWORD

    if (!adminPassword) {
      console.error("BLOG_ADMIN_PASSWORD environment variable is not set")
      return NextResponse.json(
        { error: "Admin authentication not configured" },
        { status: 500 }
      )
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      )
    }

    // Set secure HttpOnly cookie
    const cookieStore = await cookies()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    cookieStore.set("loopwell_blog_admin", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

