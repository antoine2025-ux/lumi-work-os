import { NextResponse } from "next/server";
import type {
  AppErrorCode,
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
} from "@/lib/api-error";

type ErrorOptions = {
  status?: number;
  details?: Record<string, unknown>;
};

export function createErrorResponse(
  code: AppErrorCode,
  message: string,
  options?: ErrorOptions
) {
  const payload: ApiErrorEnvelope = {
    ok: false,
    error: {
      code,
      message,
      ...(options?.details ? { details: options.details } : {}),
    },
  };

  return NextResponse.json(payload, {
    status: options?.status ?? defaultStatusForCode(code),
  });
}

export function createSuccessResponse<T>(
  data: T,
  options?: { status?: number }
) {
  const payload: ApiSuccessEnvelope<T> = {
    ok: true,
    data,
  };

  return NextResponse.json(payload, {
    status: options?.status ?? 200,
  });
}

function defaultStatusForCode(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
    case "ORG_NOT_MEMBER":
    case "ORG_OWNER_ONLY":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    case "CONFLICT":
    case "ORG_LAST_ADMIN":
      return 400;
    case "RATE_LIMITED":
      return 429;
    case "INTERNAL_SERVER_ERROR":
    default:
      return 500;
  }
}

