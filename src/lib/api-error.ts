export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "ORG_NOT_MEMBER"
  | "ORG_LAST_ADMIN"
  | "ORG_OWNER_ONLY";

export type ApiError = {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiErrorEnvelope = {
  ok: false;
  error: ApiError;
};

export type ApiSuccessEnvelope<T> = {
  ok: true;
  data: T;
};

export type AnyApiEnvelope<T = unknown> =
  | ApiSuccessEnvelope<T>
  | ApiErrorEnvelope;

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    v.ok === false &&
    v.error &&
    typeof v.error === "object" &&
    typeof v.error.code === "string" &&
    typeof v.error.message === "string"
  );
}

export type ParsedApiError = {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

export function parseApiError(body: any): ParsedApiError | null {
  if (!body || typeof body !== "object") return null;

  // New standardized envelope: { ok: false, error: { code, message, details? } }
  if (isApiErrorEnvelope(body)) {
    return {
      code: body.error.code,
      message: body.error.message,
      details: body.error.details,
    };
  }

  // Legacy pattern: { error: "string" }
  if (typeof (body as any).error === "string") {
    return {
      message: (body as any).error,
    };
  }

  // Legacy pattern: { message: "string" }
  if (typeof (body as any).message === "string") {
    return {
      message: (body as any).message,
    };
  }

  return null;
}

