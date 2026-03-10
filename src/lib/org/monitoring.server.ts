/**
 * Monitoring helpers for Org Center API routes.
 *
 * This provides structured logging for observability.
 * In production, this should be replaced with:
 * - Sentry for error tracking
 * - Datadog/OpenTelemetry for metrics
 * - CloudWatch/Logtail for log aggregation
 */

export async function recordOrgApiHit(
  route: string,
  status: number,
  workspaceId?: string | null,
  userId?: string | null
) {
  // Structured logging for observability
  // In production, this should be sent to a logging service
  console.log(
    JSON.stringify({
      type: "org_api_hit",
      route,
      status,
      orgId: workspaceId ?? null,
      userId: userId ?? null,
      ts: new Date().toISOString(),
    })
  );
}

export async function recordOrgApiError(
  route: string,
  error: unknown,
  workspaceId?: string | null,
  userId?: string | null
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      type: "org_api_error",
      route,
      error: errorMessage,
      stack: errorStack,
      orgId: workspaceId ?? null,
      userId: userId ?? null,
      ts: new Date().toISOString(),
    })
  );
}

