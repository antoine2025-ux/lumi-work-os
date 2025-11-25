import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// In production, this MUST be set via environment variable
const DEV_PASSWORD = process.env.DEV_BLOG_PASSWORD;

if (!DEV_PASSWORD && process.env.NODE_ENV === "production") {
  throw new Error("DEV_BLOG_PASSWORD environment variable is required in production");
}

// Simple session token generation
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Simple rate limiting: track failed login attempts per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt || now > attempt.resetAt) {
    // Reset or initialize
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return false; // Rate limited
  }

  attempt.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Check if password is configured
    if (!DEV_PASSWORD) {
      console.error("DEV_BLOG_PASSWORD not configured");
      return NextResponse.json(
        { error: "Authentication not configured" },
        { status: 500 }
      );
    }

    // Rate limiting check
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password || password !== DEV_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Successful login - reset rate limit for this IP
    loginAttempts.delete(clientIP);

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set("dev-blog-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dev auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}


