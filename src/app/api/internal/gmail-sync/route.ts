/**
 * Cron Job: Gmail Rolling Sync
 *
 * POST /api/internal/gmail-sync
 *
 * Syncs the last 7 days of Gmail threads for all connected users into
 * ContextItems. Rate-limited to once per hour per user (enforced in
 * syncGmailContext). Runs hourly via Vercel cron.
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
import { syncGmailContext } from "@/lib/loopbrain/context-sources/gmail";
import { logger } from "@/lib/logger";
import type { GmailIntegrationConfig } from "@/lib/gmail";

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

  const result = await runGmailSync(workspaceId);
  return NextResponse.json(result);
}

interface SyncResult {
  workspacesProcessed: number;
  usersProcessed: number;
  totalSynced: number;
  totalSkipped: number;
  errors: string[];
}

async function runGmailSync(
  targetWorkspaceId?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    workspacesProcessed: 0,
    usersProcessed: 0,
    totalSynced: 0,
    totalSkipped: 0,
    errors: [],
  };

  try {
    const whereClause = targetWorkspaceId
      ? { type: IntegrationType.GMAIL, workspaceId: targetWorkspaceId }
      : { type: IntegrationType.GMAIL };

    const integrations = await prismaUnscoped.integration.findMany({
      where: whereClause,
      select: { workspaceId: true, config: true },
    });

    for (const integration of integrations) {
      result.workspacesProcessed++;
      const config = integration.config as GmailIntegrationConfig;
      const userIds = Object.keys(config?.users ?? {});

      for (const userId of userIds) {
        const tokens = config?.users?.[userId];
        if (!tokens?.accessToken) continue;

        result.usersProcessed++;
        try {
          const syncResult = await syncGmailContext(
            userId,
            integration.workspaceId
          );
          result.totalSynced += syncResult.synced;
          result.totalSkipped += syncResult.skipped;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : String(err);
          result.errors.push(
            `${integration.workspaceId}:${userId}: ${msg}`
          );
        }
      }
    }

    logger.info("[gmail-sync] Cron complete", { ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);
    logger.error("[gmail-sync] Cron failed", { error: err });
  }

  return result;
}
