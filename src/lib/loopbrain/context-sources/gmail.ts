/**
 * Gmail Context Source for Loopbrain
 *
 * Loads recent Gmail threads for a user to provide email context
 * to Loopbrain reasoning. Read-only — never sends email.
 *
 * Tokens are stored in Integration.config.users[userId] (workspace-scoped
 * Integration model), not in the NextAuth Account table used by Calendar.
 */

import { prismaUnscoped } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getGmailOAuth2Client, getGmailClient } from "@/lib/gmail";
import { IntegrationType } from "@prisma/client";
import type { GmailIntegrationConfig } from "@/lib/gmail";

// =============================================================================
// Types
// =============================================================================

export interface GmailThreadSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  /** Gmail's auto-generated preview, max 200 chars */
  snippet: string;
  isUnread: boolean;
}

interface LoadGmailThreadsOptions {
  /** Gmail search query. Defaults to "newer_than:7d" */
  query?: string;
  /** Max messages to return. Defaults to 20 */
  maxResults?: number;
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
  const { query = "newer_than:7d", maxResults = 20 } = options;

  try {
    // Look up workspace Gmail integration (unscoped — no request context here)
    const integration = await prismaUnscoped.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
      select: { config: true },
    });

    if (!integration) return [];

    const config = integration.config as GmailIntegrationConfig;
    const userTokens = config?.users?.[userId];
    if (!userTokens?.accessToken) return [];

    // Build Gmail client from stored tokens
    const oauth2Client = getGmailOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    });

    const gmail = getGmailClient(oauth2Client);

    // List message IDs matching the query
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const messageList = listResponse.data.messages ?? [];
    if (messageList.length === 0) return [];

    // Fetch each message in metadata-only format (no body, respects privacy)
    const threads: GmailThreadSummary[] = [];
    for (const msg of messageList) {
      if (!msg.id) continue;
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "To", "Date"],
        });

        const data = full.data;
        const headers = data.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find(
            (h) => h.name?.toLowerCase() === name.toLowerCase()
          )?.value ?? "";

        const subject = getHeader("Subject") || "(No subject)";
        const fromRaw = getHeader("From");
        const toRaw = getHeader("To");
        const dateRaw = getHeader("Date");

        const parsedDate = dateRaw ? new Date(dateRaw) : new Date();
        const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        // Split To header on comma — handles the common multi-recipient case
        const to = toRaw
          ? toRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        threads.push({
          id: data.id ?? "",
          threadId: data.threadId ?? "",
          subject: subject.slice(0, 200),
          from: fromRaw,
          to,
          date,
          snippet: (data.snippet ?? "").slice(0, 200),
          isUnread: data.labelIds?.includes("UNREAD") ?? false,
        });
      } catch (msgError) {
        logger.warn("[GmailContext] Failed to fetch message metadata", {
          userId,
          msgId: msg.id,
          error: msgError,
        });
        // Continue to next message
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
    return (
      `- **${t.subject}**${unread} | From: ${t.from}${toDisplay ? ` | To: ${toDisplay}` : ""} | ${dateStr}\n` +
      `  ${t.snippet}`
    );
  });

  return `## Recent emails (last 7 days):\n${lines.join("\n")}`;
}
