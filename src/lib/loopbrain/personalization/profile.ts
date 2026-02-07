/**
 * Loopbrain Personalization — per-user profile layer.
 *
 * getProfile:               Fetch the user's style profile (null if none).
 * updateProfileFromFeedback: Adjust profile based on chat feedback signals.
 * buildStyleInstructions:    Produce a system-prompt block from the profile.
 */

import { prisma } from "@/lib/db";
import type { LoopbrainUserProfile } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackSignal = "too_long" | "too_short" | "wrong_tone" | "good";
export type FeedbackRating = "up" | "down";

export interface ChatFeedback {
  rating: FeedbackRating;
  signal?: FeedbackSignal;
  comment?: string;
}

interface FormattingPrefs {
  bullets?: boolean;
  headings?: boolean;
  checklists?: boolean;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Load the user's Loopbrain profile. Returns null when no profile exists yet.
 */
export async function getProfile(
  workspaceId: string,
  userId: string,
): Promise<LoopbrainUserProfile | null> {
  return prisma.loopbrainUserProfile.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

// ---------------------------------------------------------------------------
// Write — feedback-driven profile adjustment
// ---------------------------------------------------------------------------

/**
 * Upsert profile adjustments from a single piece of chat feedback.
 *
 * - "too_long"  → decrement verbosity (min 1)
 * - "too_short" → increment verbosity (max 5)
 * - "wrong_tone" → no automatic change (requires explicit preference update)
 * - thumbs-up with no signal → reinforce current settings (no-op on values)
 * - thumbs-down with no signal → slight verbosity decrement as safe default
 */
export async function updateProfileFromFeedback(
  workspaceId: string,
  userId: string,
  feedback: ChatFeedback,
): Promise<LoopbrainUserProfile> {
  const existing = await getProfile(workspaceId, userId);
  const currentVerbosity = existing?.verbosity ?? 3;

  let newVerbosity = currentVerbosity;

  if (feedback.signal === "too_long") {
    newVerbosity = Math.max(1, currentVerbosity - 1);
  } else if (feedback.signal === "too_short") {
    newVerbosity = Math.min(5, currentVerbosity + 1);
  } else if (feedback.rating === "down" && !feedback.signal) {
    // Generic thumbs-down: nudge verbosity down by 1 as a safe default
    newVerbosity = Math.max(1, currentVerbosity - 1);
  }

  return prisma.loopbrainUserProfile.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: {
      workspaceId,
      userId,
      verbosity: newVerbosity,
    },
    update: {
      verbosity: newVerbosity,
    },
  });
}

// ---------------------------------------------------------------------------
// System-prompt builder
// ---------------------------------------------------------------------------

const VERBOSITY_LABELS: Record<number, string> = {
  1: "very terse — 1-2 sentences max",
  2: "concise — short paragraphs, minimal detail",
  3: "balanced — moderate detail",
  4: "detailed — thorough explanations",
  5: "comprehensive — include all relevant context and nuance",
};

/**
 * Build a system-prompt style block from a user profile.
 * Returns an empty string when profile is null (graceful no-op).
 */
export function buildStyleInstructions(
  profile: LoopbrainUserProfile | null,
): string {
  if (!profile) return "";

  const lines: string[] = ["## User Preferences"];

  // Tone
  if (profile.tone && profile.tone !== "balanced") {
    lines.push(`- Tone: ${profile.tone}`);
  }

  // Verbosity
  const label = VERBOSITY_LABELS[profile.verbosity] ?? VERBOSITY_LABELS[3];
  lines.push(`- Verbosity: ${profile.verbosity}/5 (${label})`);

  // Formatting
  const fmt = profile.formatting as FormattingPrefs | null;
  if (fmt && typeof fmt === "object") {
    const parts: string[] = [];
    if (fmt.bullets) parts.push("use bullet lists");
    if (fmt.headings) parts.push("use section headings");
    if (fmt.checklists) parts.push("use checklists where appropriate");
    if (parts.length > 0) {
      lines.push(`- Formatting: ${parts.join(", ")}`);
    }
  }

  // Focus projects — informational hint for the LLM
  const focusIds = profile.focusProjectIds as string[] | null;
  if (Array.isArray(focusIds) && focusIds.length > 0) {
    lines.push(
      `- Focus projects (prioritize context from these): ${focusIds.join(", ")}`,
    );
  }

  return lines.join("\n");
}
