import { NextResponse } from "next/server";
import { ROLE_CAPABILITIES } from "@/lib/org/capabilities";

export async function GET() {
  return NextResponse.json({
    roles: ROLE_CAPABILITIES,
  });
}

