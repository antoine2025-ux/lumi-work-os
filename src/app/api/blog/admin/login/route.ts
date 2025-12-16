import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
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
    console.error("Blog admin login error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}

