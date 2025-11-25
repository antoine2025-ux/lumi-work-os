import { NextRequest, NextResponse } from "next/server";
import { isDevAuthenticated } from "@/lib/dev-auth";

export async function GET(request: NextRequest) {
  try {
    const authenticated = await isDevAuthenticated(request);
    
    if (authenticated) {
      return NextResponse.json({ authenticated: true });
    }
    
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  } catch (error) {
    console.error("Error checking dev auth:", error);
    return NextResponse.json(
      { authenticated: false, error: "Error checking authentication" },
      { status: 500 }
    );
  }
}

