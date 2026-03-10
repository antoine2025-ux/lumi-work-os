/**
 * On-Demand Gmail Search for Loopbrain
 *
 * Searches a user's Gmail for threads matching a natural-language query.
 * Results are ephemeral — used only for the current LLM call, never stored.
 *
 * Unlimited history (searches all of Gmail, not just last 7 days).
 * Max 10 results per query. Context text capped at ~2000 tokens.
 */

import { logger } from "@/lib/logger";
import { loadGmailThreads, type GmailThreadSummary } from "./gmail";

// =============================================================================
// Constants
// =============================================================================

const MAX_SEARCH_RESULTS = 10;
const MAX_CONTEXT_CHARS = 8000; // ~2000 tokens at ~4 chars/token

// Phrases to strip when converting natural language to Gmail search query
const INTENT_PREFIXES = [
  /^what did\s+(\S+)\s+email\s*(me\s+)?about\s*/i,
  /^find\s+(the\s+)?emails?\s*(about|from|regarding|on)\s*/i,
  /^(look up|search|check)\s+(the\s+)?emails?\s*(about|from|regarding|on)?\s*/i,
  /^emails?\s+(about|from|regarding|on)\s*/i,
  /^(show me|get)\s+(the\s+)?emails?\s*(about|from|regarding|on)?\s*/i,
  /^what\s+(emails?|messages?)\s*(did\s+\S+\s+send\s*)?(about|regarding|on)?\s*/i,
  /^(check|look at)\s+my\s+(email|inbox|gmail)\s*(for|about)?\s*/i,
];

// =============================================================================
// Types
// =============================================================================

export interface GmailSearchResult {
  threads: GmailThreadSummary[];
  contextText: string;
  searchQuery: string;
}

// =============================================================================
// Query extraction
// =============================================================================

/**
 * Extract a Gmail-compatible search query from a natural language question.
 *
 * "what did Sarah email about the Q3 budget?" → "from:Sarah Q3 budget"
 * "find emails about the product launch"      → "product launch"
 * "check my email from John"                  → "from:John"
 */
export function extractSearchQuery(naturalQuery: string): string {
  let q = naturalQuery.trim();

  // Try each prefix pattern — some capture a person name
  for (const pattern of INTENT_PREFIXES) {
    const match = q.match(pattern);
    if (match) {
      q = q.replace(pattern, "").trim();
      break;
    }
  }

  // Detect "from <person>" pattern in the original query
  const fromMatch = naturalQuery.match(
    /\b(?:from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
  );
  // Detect "what did <person> email" pattern
  const didPersonMatch = naturalQuery.match(
    /what did\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+email/i
  );

  const personName = didPersonMatch?.[1] ?? fromMatch?.[1];

  // Remove trailing question marks and filler
  q = q.replace(/[?!.]+$/, "").trim();
  q = q.replace(/^(the|a|an|my|our)\s+/i, "").trim();

  // If we extracted a person name, prepend from: operator
  if (personName && !q.toLowerCase().includes(personName.toLowerCase())) {
    q = `from:${personName} ${q}`;
  } else if (personName && !q.toLowerCase().startsWith("from:")) {
    q = `from:${personName} ${q.replace(new RegExp(personName, "i"), "").trim()}`;
  }

  // Remove empty/whitespace-only result
  if (!q.trim()) {
    q = naturalQuery.replace(/[?!.]+$/, "").trim();
  }

  return q;
}

// =============================================================================
// Main search
// =============================================================================

/**
 * Search Gmail for threads matching a user's natural-language query.
 *
 * Returns ephemeral context — no permanent storage.
 */
export async function searchGmailForContext(
  userId: string,
  workspaceId: string,
  query: string,
  maxResults = MAX_SEARCH_RESULTS
): Promise<GmailSearchResult> {
  const searchQuery = extractSearchQuery(query);

  logger.info("[GmailSearch] Searching", {
    userId,
    workspaceId,
    originalQuery: query,
    searchQuery,
    maxResults,
  });

  const threads = await loadGmailThreads(userId, workspaceId, {
    query: searchQuery,
    maxResults,
    includeBodyPreview: true,
  });

  const contextText = formatSearchResultsForLLM(threads);

  return { threads, contextText, searchQuery };
}

// =============================================================================
// LLM context formatter
// =============================================================================

function formatSearchResultsForLLM(threads: GmailThreadSummary[]): string {
  if (threads.length === 0) return "";

  let output = "[Email Context - Search Results]\n\n";
  let charCount = output.length;

  for (const t of threads) {
    const dateStr = t.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const attachNote =
      t.hasAttachments && t.attachmentNames.length > 0
        ? ` [Attachments: ${t.attachmentNames.slice(0, 3).join(", ")}]`
        : "";
    const preview = (t.bodyPreview || t.snippet).slice(0, 400);

    const entry =
      `From: ${t.from} (${dateStr}) — "${t.subject}"${attachNote}\n` +
      `To: ${t.to.slice(0, 3).join(", ")}${t.to.length > 3 ? ", ..." : ""}` +
      `${t.cc.length > 0 ? ` | Cc: ${t.cc.slice(0, 2).join(", ")}` : ""}` +
      `${t.messageCount > 1 ? ` | ${t.messageCount} messages in thread` : ""}\n` +
      `Preview: "${preview}"\n\n`;

    if (charCount + entry.length > MAX_CONTEXT_CHARS) break;
    output += entry;
    charCount += entry.length;
  }

  return output.trim();
}
