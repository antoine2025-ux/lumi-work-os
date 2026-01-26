import { NextResponse } from "next/server";

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
