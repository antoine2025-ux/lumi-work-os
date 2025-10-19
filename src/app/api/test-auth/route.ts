import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({ 
      message: "Auth test endpoint working",
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Auth test failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
