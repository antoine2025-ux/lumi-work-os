import { NextResponse } from "next/server"

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const hasGoogleId = !!process.env.GOOGLE_CLIENT_ID
  const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET
  const googleIdValue = process.env.GOOGLE_CLIENT_ID || "NOT SET"
  const googleSecretValue = process.env.GOOGLE_CLIENT_SECRET ? "***SET***" : "NOT SET"
  
  const isPlaceholderId = googleIdValue === "REPLACE_WITH_GOOGLE_CLIENT_ID"
  const isPlaceholderSecret = process.env.GOOGLE_CLIENT_SECRET === "REPLACE_WITH_GOOGLE_CLIENT_SECRET"

  return NextResponse.json({
    googleClientId: {
      exists: hasGoogleId,
      isPlaceholder: isPlaceholderId,
      value: isPlaceholderId ? "PLACEHOLDER" : (googleIdValue.length > 50 ? googleIdValue.substring(0, 50) + "..." : googleIdValue),
    },
    googleClientSecret: {
      exists: hasGoogleSecret,
      isPlaceholder: isPlaceholderSecret,
      value: googleSecretValue,
    },
    hasValidCredentials: hasGoogleId && hasGoogleSecret && !isPlaceholderId && !isPlaceholderSecret,
    nextAuthUrl: process.env.NEXTAUTH_URL || "NOT SET",
  })
}

