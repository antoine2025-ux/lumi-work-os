/**
 * Gmail Context Source for Loopbrain
 *
 * Loads recent Gmail threads for a user to provide email context
 * to Loopbrain reasoning. Read-only — never sends email.
 *
 * Two modes:
 * 1. Live fetch — `loadGmailThreads()` for real-time prompt injection
 * 2. Rolling sync — `syncGmailContext()` persists lightweight summaries
 *    as ContextItems for briefing/meeting-prep use
 *
 * Tokens are stored in Integration.config.users[userId] (workspace-scoped
 * Integration model), not in the NextAuth Account table used by Calendar.
 */

import { prisma } from "@/lib/db";
import { prismaUnscoped } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getGmailOAuth2Client, getGmailClient } from "@/lib/gmail";
import { IntegrationType } from "@prisma/client";
import type { GmailIntegrationConfig } from "@/lib/gmail";
import type { gmail_v1 } from "googleapis";

// =============================================================================
// Constants
// =============================================================================

const GMAIL_THREAD_TYPE = "gmail_thread";
const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const CONTEXT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BODY_PREVIEW_CHARS = 500;
const DEFAULT_SYNC_QUERY =
  "newer_than:7d -category:promotions -category:social -in:spam -in:trash";

// =============================================================================
// Types
// =============================================================================

export interface GmailThreadSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  date: Date;
  /** Gmail's auto-generated preview, max 200 chars */
  snippet: string;
  /** First 500 chars of the latest message body (HTML stripped) */
  bodyPreview: string;
  labels: string[];
  hasAttachments: boolean;
  attachmentNames: string[];
  messageCount: number;
  isUnread: boolean;
}

interface LoadGmailThreadsOptions {
  /** Gmail search query. Defaults to 7-day window excluding noise categories */
  query?: string;
  /** Max threads to return. Defaults to 50 */
  maxResults?: number;
  /** Fetch body preview (requires full format). Defaults to true */
  includeBodyPreview?: boolean;
}

export interface SyncGmailContextResult {
  synced: number;
  skipped: number;
}

// =============================================================================
// Helpers
// =============================================================================

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBodyFromPayload(
  payload: gmail_v1.Schema$MessagePart | undefined
): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    try {
      const html = Buffer.from(payload.body.data, "base64").toString("utf-8");
      return stripHtmlTags(html);
    } catch {
      return "";
    }
  }

  const parts = payload.parts;
  if (!parts?.length) {
    if (payload.body?.data) {
      try {
        const raw = Buffer.from(payload.body.data, "base64").toString("utf-8");
        return payload.mimeType?.includes("html") ? stripHtmlTags(raw) : raw;
      } catch {
        return "";
      }
    }
    return "";
  }

  const textPart = parts.find((p) => p.mimeType === "text/plain");
  if (textPart?.body?.data) {
    try {
      return Buffer.from(textPart.body.data, "base64").toString("utf-8");
    } catch {
      /* fall through */
    }
  }

  const htmlPart = parts.find((p) => p.mimeType === "text/html");
  if (htmlPart?.body?.data) {
    try {
      const html = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
      return stripHtmlTags(html);
    } catch {
      /* fall through */
    }
  }

  return parts.map((p) => extractBodyFromPayload(p)).join("\n\n");
}

function extractAttachmentNames(
  payload: gmail_v1.Schema$MessagePart | undefined
): string[] {
  if (!payload) return [];
  const names: string[] = [];
  if (payload.filename && payload.filename.length > 0) {
    names.push(payload.filename);
  }
  for (const part of payload.parts ?? []) {
    names.push(...extractAttachmentNames(part));
  }
  return names;
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function splitHeaderList(raw: string): string[] {
  return raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

// =============================================================================
// Connection check
// =============================================================================

/**
 * Check if Gmail is connected for the user in the workspace.
 * Does not make API calls — only checks integration and tokens.
 */
export async function isGmailConnected(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const integration = await prismaUnscoped.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
      select: { config: true },
    });
    if (!integration) return false;
    const config = integration.config as GmailIntegrationConfig;
    const userTokens = config?.users?.[userId];
    return !!(userTokens?.accessToken ?? userTokens?.refreshToken);
  } catch {
    return false;
  }
}

// =============================================================================
// Main loader
// =============================================================================

/**
 * Load recent Gmail threads for a user.
 *
 * Returns [] gracefully when:
 * - No Gmail integration exists for the workspace
 * - User hasn't connected their Gmail account
 * - Google API call fails for any reason
 *
 * Never throws — Loopbrain must never fail because email is unavailable.
 */
export async function loadGmailThreads(
  userId: string,
  workspaceId: string,
  options: LoadGmailThreadsOptions = {}
): Promise<GmailThreadSummary[]> {
  const {
    query = DEFAULT_SYNC_QUERY,
    maxResults = 50,
    includeBodyPreview = true,
  } = options;

  try {
    const integration = await prismaUnscoped.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
      select: { config: true },
    });

    if (!integration) return [];

    const config = integration.config as GmailIntegrationConfig;
    const userTokens = config?.users?.[userId];
    if (!userTokens?.accessToken) return [];

    const oauth2Client = getGmailOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    });

    const gmail = getGmailClient(oauth2Client);

    const listResponse = await gmail.users.threads.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const threadList = listResponse.data.threads ?? [];
    if (threadList.length === 0) return [];

    const threads: GmailThreadSummary[] = [];
    for (const thread of threadList) {
      if (!thread.id) continue;
      try {
        const threadData = await gmail.users.threads.get({
          userId: "me",
          id: thread.id,
          format: includeBodyPreview ? "full" : "metadata",
          ...(includeBodyPreview
            ? {}
            : {
                metadataHeaders: ["Subject", "From", "To", "Cc", "Date"],
              }),
        });

        const messages = threadData.data.messages ?? [];
        if (messages.length === 0) continue;

        const latestMessage = messages[messages.length - 1];
        const headers = latestMessage.payload?.headers ?? [];

        const subject = getHeader(headers, "Subject") || "(No subject)";
        const fromRaw = getHeader(headers, "From");
        const toRaw = getHeader(headers, "To");
        const ccRaw = getHeader(headers, "Cc");
        const dateRaw = getHeader(headers, "Date");

        const parsedDate = dateRaw ? new Date(dateRaw) : new Date();
        const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        let bodyPreview = "";
        if (includeBodyPreview) {
          const rawBody = extractBodyFromPayload(latestMessage.payload);
          bodyPreview = rawBody.slice(0, MAX_BODY_PREVIEW_CHARS);
        }

        const attachmentNames = extractAttachmentNames(latestMessage.payload);
        const labelIds = latestMessage.labelIds ?? [];

        threads.push({
          id: latestMessage.id ?? "",
          threadId: threadData.data.id ?? "",
          subject: subject.slice(0, 200),
          from: fromRaw,
          to: splitHeaderList(toRaw),
          cc: splitHeaderList(ccRaw),
          date,
          snippet: (latestMessage.snippet ?? "").slice(0, 200),
          bodyPreview,
          labels: labelIds,
          hasAttachments: attachmentNames.length > 0,
          attachmentNames,
          messageCount: messages.length,
          isUnread: labelIds.includes("UNREAD"),
        });
      } catch (msgError) {
        logger.warn("[GmailContext] Failed to fetch thread", {
          userId,
          threadId: thread.id,
          error: msgError,
        });
      }
    }

    logger.debug("[GmailContext] Loaded Gmail threads", {
      userId,
      workspaceId,
      count: threads.length,
    });

    return threads;
  } catch (error) {
    logger.warn("[GmailContext] Failed to load Gmail threads", {
      userId,
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Rolling Sync — persist lightweight summaries as ContextItems
// =============================================================================

/**
 * Sync recent Gmail threads into ContextItems for offline/briefing use.
 *
 * Rate-limited to once per hour per user. Cleans up items older than 24h.
 * Never throws — returns counts.
 */
export async function syncGmailContext(
  userId: string,
  workspaceId: string
): Promise<SyncGmailContextResult> {
  const result: SyncGmailContextResult = { synced: 0, skipped: 0 };

  try {
    const lastItem = await prisma.contextItem.findFirst({
      where: {
        workspaceId,
        type: GMAIL_THREAD_TYPE,
        data: { path: ["metadata", "userId"], equals: userId },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    if (lastItem && Date.now() - lastItem.updatedAt.getTime() < SYNC_COOLDOWN_MS) {
      logger.debug("[GmailSync] Skipping — last sync too recent", {
        userId,
        workspaceId,
        lastSync: lastItem.updatedAt,
      });
      return result;
    }

    const threads = await loadGmailThreads(userId, workspaceId, {
      query: DEFAULT_SYNC_QUERY,
      maxResults: 50,
      includeBodyPreview: true,
    });

    if (threads.length === 0) return result;

    for (const thread of threads) {
      try {
        const contextId = `gmail_${thread.threadId}`;
        const content = `Email from ${thread.from} — ${thread.subject}: ${thread.bodyPreview || thread.snippet}`;
        const itemData = {
          content,
          metadata: {
            threadId: thread.threadId,
            from: thread.from,
            to: thread.to,
            cc: thread.cc,
            date: thread.date.toISOString(),
            labels: thread.labels,
            hasAttachments: thread.hasAttachments,
            attachmentNames: thread.attachmentNames,
            messageCount: thread.messageCount,
            userId,
          },
        };

        const existing = await prisma.contextItem.findFirst({
          where: { contextId, type: GMAIL_THREAD_TYPE, workspaceId },
          select: { id: true },
        });

        if (existing) {
          await prisma.contextItem.update({
            where: { id: existing.id },
            data: {
              title: thread.subject,
              summary: content.slice(0, 500),
              data: itemData,
            },
          });
        } else {
          await prisma.contextItem.create({
            data: {
              contextId,
              workspaceId,
              type: GMAIL_THREAD_TYPE,
              title: thread.subject,
              summary: content.slice(0, 500),
              data: itemData,
            },
          });
        }

        result.synced++;
      } catch (upsertErr) {
        logger.warn("[GmailSync] Failed to upsert thread", {
          threadId: thread.threadId,
          error: upsertErr,
        });
        result.skipped++;
      }
    }

    // Clean up stale items older than 24h
    const cutoff = new Date(Date.now() - CONTEXT_TTL_MS);
    await prisma.contextItem.deleteMany({
      where: {
        workspaceId,
        type: GMAIL_THREAD_TYPE,
        updatedAt: { lt: cutoff },
      },
    });

    logger.info("[GmailSync] Sync complete", {
      userId,
      workspaceId,
      synced: result.synced,
      skipped: result.skipped,
    });
  } catch (error) {
    logger.warn("[GmailSync] Sync failed", { userId, workspaceId, error });
  }

  return result;
}

// =============================================================================
// Load from store — read persisted ContextItems for briefing/meeting-prep
// =============================================================================

export interface StoredGmailContext {
  subject: string;
  from: string;
  date: string;
  snippet: string;
  bodyPreview: string;
  to: string[];
  cc: string[];
  hasAttachments: boolean;
  attachmentNames: string[];
}

/**
 * Load Gmail context from persisted ContextItems (populated by syncGmailContext).
 * Falls back to live fetch if no stored items exist.
 */
export async function loadGmailContextFromStore(
  userId: string,
  workspaceId: string,
  limit = 20
): Promise<StoredGmailContext[]> {
  try {
    const items = await prisma.contextItem.findMany({
      where: {
        workspaceId,
        type: GMAIL_THREAD_TYPE,
        data: { path: ["metadata", "userId"], equals: userId },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    if (items.length > 0) {
      return items.map((item) => {
        const data = item.data as {
          content?: string;
          metadata?: {
            from?: string;
            date?: string;
            to?: string[];
            cc?: string[];
            hasAttachments?: boolean;
            attachmentNames?: string[];
          };
        };
        return {
          subject: item.title,
          from: data.metadata?.from ?? "",
          date: data.metadata?.date ?? item.createdAt.toISOString(),
          snippet: item.summary ?? "",
          bodyPreview: data.content ?? "",
          to: data.metadata?.to ?? [],
          cc: data.metadata?.cc ?? [],
          hasAttachments: data.metadata?.hasAttachments ?? false,
          attachmentNames: data.metadata?.attachmentNames ?? [],
        };
      });
    }

    // Fallback: live fetch if store is empty
    const threads = await loadGmailThreads(userId, workspaceId, {
      maxResults: limit,
    });
    return threads.map((t) => ({
      subject: t.subject,
      from: t.from,
      date: t.date.toISOString(),
      snippet: t.snippet,
      bodyPreview: t.bodyPreview,
      to: t.to,
      cc: t.cc,
      hasAttachments: t.hasAttachments,
      attachmentNames: t.attachmentNames,
    }));
  } catch (error) {
    logger.warn("[GmailContext] Failed to load from store", {
      userId,
      workspaceId,
      error,
    });
    return [];
  }
}

// =============================================================================
// Prompt formatter
// =============================================================================

/**
 * Format Gmail threads for inclusion in a Loopbrain prompt.
 * Returns empty string if no threads — caller should skip injection.
 */
export function formatGmailThreadsForPrompt(
  threads: GmailThreadSummary[]
): string {
  if (threads.length === 0) return "";

  const lines = threads.map((t) => {
    const unread = t.isUnread ? " [UNREAD]" : "";
    const toDisplay =
      t.to.length > 0
        ? t.to.slice(0, 3).join(", ") + (t.to.length > 3 ? ", …" : "")
        : "";
    const dateStr = t.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const attachmentNote =
      t.hasAttachments && t.attachmentNames.length > 0
        ? ` [📎 ${t.attachmentNames.slice(0, 3).join(", ")}]`
        : "";
    const preview = t.bodyPreview || t.snippet;
    return (
      `- **${t.subject}**${unread}${attachmentNote} | From: ${t.from}${toDisplay ? ` | To: ${toDisplay}` : ""} | ${dateStr}\n` +
      `  ${preview.slice(0, 300)}`
    );
  });

  return `## Recent emails (last 7 days):\n${lines.join("\n")}`;
}

/**
 * Format Gmail threads for planner context (lightweight).
 * Includes threadId, messageId, subject, from, date, one-line snippet.
 * Used when the user intent suggests email reply/send — max 8 threads to avoid token blow-up.
 */
export function formatGmailThreadsForPlannerContext(
  threads: GmailThreadSummary[],
  maxThreads = 8
): string {
  if (threads.length === 0) return "";

  const limited = threads.slice(0, maxThreads);
  const lines = limited.map((t) => {
    const dateStr = t.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const snippet = (t.snippet || t.bodyPreview || "").slice(0, 80).replace(/\n/g, " ");
    return `- threadId: ${t.threadId} | messageId: ${t.id} | Subject: ${t.subject} | From: ${t.from} | ${dateStr} | ${snippet}`;
  });

  return `\n## Recent email threads (use threadId and messageId for replyToEmail):\n${lines.join("\n")}`;
}

/**
 * Delete all gmail_thread ContextItems for a user in a workspace.
 * Used when user disconnects Gmail integration.
 */
export async function deleteGmailContextForUser(
  userId: string,
  workspaceId: string
): Promise<number> {
  const result = await prisma.contextItem.deleteMany({
    where: {
      workspaceId,
      type: GMAIL_THREAD_TYPE,
      data: { path: ["metadata", "userId"], equals: userId },
    },
  });
  return result.count;
}
