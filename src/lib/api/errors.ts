import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message = "Bad request") {
  return apiError(400, message);
}

export function unauthorized(message = "Unauthorized") {
  return apiError(401, message);
}

export function forbidden(message = "Forbidden") {
  return apiError(403, message);
}

export function notFound(message = "Not found") {
  return apiError(404, message);
}

export function internalError(message = "Internal server error") {
  return apiError(500, message);
}

// Standardized error response helpers used by org routes
export function unauthorizedResponse(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

export function forbiddenResponse(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "FORBIDDEN", message } },
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export function serviceUnavailableResponse(
  message: string,
  options?: { retryable?: boolean }
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code: "SERVICE_UNAVAILABLE", message, retryable: options?.retryable ?? false },
    },
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

export function internalErrorResponse(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message } },
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

// Check if error is a Prisma error
export function isPrismaError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return true;
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientValidationError) return true;
  
  // Check error code pattern (Prisma errors have codes like P2002, P1001, etc.)
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as any).code;
    if (typeof code === "string" && code.startsWith("P")) return true;
  }
  
  // Check error message for Prisma indicators
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("prisma") || message.includes("database") || message.includes("query")) {
      return true;
    }
  }
  
  return false;
}

// Classify auth errors (401 vs 403)
export function classifyAuthError(error: unknown): "unauthorized" | "forbidden" | null {
  if (!error) return null;
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("unauthorized") || message.includes("authentication")) {
      return "unauthorized";
    }
    if (message.includes("forbidden") || message.includes("permission") || message.includes("access denied")) {
      return "forbidden";
    }
  }
  
  // Check for specific error codes
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as any).code;
    if (code === "UNAUTHORIZED" || code === 401) return "unauthorized";
    if (code === "FORBIDDEN" || code === 403) return "forbidden";
  }
  
  return null;
}

// Log API errors with context
export function logApiError(route: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${route}] Error:`, errorMessage);
  if (errorStack) {
    console.error(`[${route}] Stack:`, errorStack);
  }
  
  // Log additional context for Prisma errors
  if (isPrismaError(error)) {
    console.error(`[${route}] Prisma error detected`);
    if (error && typeof error === "object" && "code" in error) {
      console.error(`[${route}] Prisma error code:`, (error as any).code);
    }
  }
}

// Check if verbose logging should be enabled
export function shouldLogVerbose(): boolean {
  return process.env.NODE_ENV === "development" || process.env.API_VERBOSE_LOGGING === "true";
}
