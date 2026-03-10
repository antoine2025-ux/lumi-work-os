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
import { emitEvent } from "@/lib/events/emit";
import { POLICY_EVENTS } from "@/lib/loopbrain/policies/listeners";
import type { GmailIntegrationConfig } from "@/lib/gmail";
import type { EmailReceivedEvent } from "@/lib/loopbrain/policies/event-matcher";

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

          if (syncResult.synced > 0) {
            await emitEmailEventsForNewThreads(integration.workspaceId, userId);
          }
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

/**
 * Emit policy events for recently synced Gmail threads so email-triggered
 * policies can pick them up. Queries ContextItems created in the last hour.
 */
async function emitEmailEventsForNewThreads(
  workspaceId: string,
  userId: string,
): Promise<void> {
  try {
    const recentItems = await prismaUnscoped.contextItem.findMany({
      where: {
        workspaceId,
        type: "gmail_thread",
        data: { path: ["metadata", "userId"], equals: userId },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { data: true, contextId: true },
      take: 20,
    });

    for (const item of recentItems) {
      const data = item.data as Record<string, unknown> | null;
      const metadata = data?.metadata as Record<string, unknown> | null;
      const event: EmailReceivedEvent = {
        workspaceId,
        userId,
        subject: (metadata?.subject as string) ?? "",
        from: (metadata?.from as string) ?? "",
        snippet: (data?.content as string)?.slice(0, 500) ?? "",
        threadId: item.contextId ?? "",
      };

      if (event.threadId) {
        await emitEvent(POLICY_EVENTS.EMAIL_RECEIVED, event);
      }
    }
  } catch (err) {
    logger.warn("[gmail-sync] Failed to emit policy events", {
      workspaceId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
