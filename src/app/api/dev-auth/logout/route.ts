import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("dev-blog-session");
  
  return NextResponse.json({ success: true });
}


