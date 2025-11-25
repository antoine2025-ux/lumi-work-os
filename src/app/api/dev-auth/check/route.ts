import { NextRequest, NextResponse } from "next/server";
import { isDevAuthenticated } from "@/lib/dev-auth";

export async function GET(request: NextRequest) {
  const authenticated = await isDevAuthenticated(request);
  
  if (authenticated) {
    return NextResponse.json({ authenticated: true });
  }
  
  return NextResponse.json(
    { authenticated: false },
    { status: 401 }
  );
}

