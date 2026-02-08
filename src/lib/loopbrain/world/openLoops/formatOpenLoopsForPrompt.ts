/**
 * Format open loops into a prompt-ready text section for the LLM.
 *
 * Returns an empty string when there are no open loops, so callers
 * can simply skip injection.
 */

import type { LoopbrainOpenLoop } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  BLOCKED: "Blocked",
  WAITING: "Waiting",
  OVERDUE: "Overdue",
  NEEDS_RESPONSE: "Needs response",
};

export function formatOpenLoopsForPrompt(
  loops: LoopbrainOpenLoop[],
): string {
  if (!loops || loops.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Open Loops (things I'm tracking for you)");
  lines.push("");

  for (const loop of loops) {
    const label = TYPE_LABELS[loop.type] ?? loop.type;
    const detailSuffix = loop.detail ? ` — ${loop.detail}` : "";
    lines.push(`- ${label}: "${loop.title}" (${loop.entityType}${detailSuffix})`);
  }

  lines.push("");
  lines.push(
    "If any of these are relevant to the user's question, mention them briefly. " +
    "Do not list all loops unprompted — only surface what is contextually useful.",
  );

  return lines.join("\n");
}
