/**
 * Cron Job: Slack Rolling Sync
 *
 * POST /api/internal/slack-sync
 *
 * Syncs the last 7 days of Slack messages for all connected workspaces into
 * ContextItems. Rate-limited to once per hour per workspace (enforced in
 * syncSlackContext). Runs hourly at :30 via Vercel cron.
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). In non-production, the secret
 * check is bypassed for manual testing.
 *
 * Body (optional): { workspaceId?: string } — limit to a single workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { IntegrationType } from "@prisma/client";
import { syncSlackContext } from "@/lib/loopbrain/context-sources/slack";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getCronSecret(): string | null {
  return (
    process.env.LOOPBRAIN_CRON_SECRET ?? process.env.CRON_SECRET ?? null
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return process.env.NODE_ENV !== "production";
  const headerSecret =
    request.headers.get("x-cron-secret") ??
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let workspaceId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    workspaceId =
      typeof body?.workspaceId === "string" ? body.workspaceId : undefined;
  } catch {
    // No body or invalid JSON — process all workspaces
  }

  const result = await runSlackSync(workspaceId);
  return NextResponse.json(result);
}

interface SyncResult {
  workspacesProcessed: number;
  totalSynced: number;
  totalChannels: number;
  errors: string[];
}

async function runSlackSync(
  targetWorkspaceId?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    workspacesProcessed: 0,
    totalSynced: 0,
    totalChannels: 0,
    errors: [],
  };

  try {
    const whereClause = targetWorkspaceId
      ? { type: IntegrationType.SLACK, isActive: true, workspaceId: targetWorkspaceId }
      : { type: IntegrationType.SLACK, isActive: true };

    const integrations = await prismaUnscoped.integration.findMany({
      where: whereClause,
      select: { workspaceId: true },
    });

    for (const integration of integrations) {
      result.workspacesProcessed++;
      try {
        const syncResult = await syncSlackContext(integration.workspaceId);
        result.totalSynced += syncResult.synced;
        result.totalChannels += syncResult.channels;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${integration.workspaceId}: ${msg}`);
      }
    }

    logger.info("[slack-sync] Cron complete", { ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);
    logger.error("[slack-sync] Cron failed", { error: err });
  }

  return result;
}
