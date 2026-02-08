/**
 * Loopbrain Personalization — per-user profile layer.
 *
 * getProfile:               Fetch the user's style profile (null if none).
 * updateProfileFromFeedback: Adjust profile based on chat feedback signals.
 * buildStyleInstructions:    Produce a system-prompt block from the profile.
 *
 * All values are clamped / sanitized on both read and write paths.
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

export interface FormattingPrefs {
  bullets?: boolean;
  headings?: boolean;
  checklists?: boolean;
}

// ---------------------------------------------------------------------------
// Constants & validators
// ---------------------------------------------------------------------------

const MIN_VERBOSITY = 1;
const MAX_VERBOSITY = 5;
const MAX_FOCUS_PROJECTS = 20;
const MAX_FORMATTING_BYTES = 256;

export const VALID_TONES = ["balanced", "concise", "friendly", "formal"] as const;
export type ValidTone = (typeof VALID_TONES)[number];

/**
 * Clamp verbosity to [1..5] and round to an integer.
 */
export function clampVerbosity(v: number): number {
  return Math.max(MIN_VERBOSITY, Math.min(MAX_VERBOSITY, Math.round(v)));
}

/**
 * Sanitize formatting JSON — allow only known boolean keys.
 * Returns a safe FormattingPrefs object. Rejects oversized input.
 */
export function sanitizeFormatting(raw: unknown): FormattingPrefs {
  if (!raw || typeof raw !== "object") return {};

  // Guard against oversized payloads
  try {
    const serialized = JSON.stringify(raw);
    if (serialized.length > MAX_FORMATTING_BYTES) return {};
  } catch {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const result: FormattingPrefs = {};

  if (typeof source.bullets === "boolean") result.bullets = source.bullets;
  if (typeof source.headings === "boolean") result.headings = source.headings;
  if (typeof source.checklists === "boolean") result.checklists = source.checklists;

  return result;
}

/**
 * Validate tone — return a known value or default to "balanced".
 */
export function validateTone(tone: unknown): ValidTone {
  if (typeof tone === "string" && (VALID_TONES as readonly string[]).includes(tone)) {
    return tone as ValidTone;
  }
  return "balanced";
}

/**
 * Cap focusProjectIds to MAX_FOCUS_PROJECTS entries, filtering non-strings.
 */
function sanitizeFocusProjectIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .slice(0, MAX_FOCUS_PROJECTS);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Load the user's Loopbrain profile. Returns null when no profile exists yet.
 * Returns null early for falsy workspaceId or userId (safety guard when called
 * from the orchestrator which reads from req rather than the auth chain).
 */
export async function getProfile(
  workspaceId: string,
  userId: string,
): Promise<LoopbrainUserProfile | null> {
  if (!workspaceId || !userId) return null;

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
 * - "too_long"  -> decrement verbosity (min 1)
 * - "too_short" -> increment verbosity (max 5)
 * - "wrong_tone" -> no automatic change (requires explicit preference update)
 * - thumbs-up with no signal -> reinforce current settings (no-op on values)
 * - thumbs-down with no signal -> slight verbosity decrement as safe default
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
    newVerbosity = currentVerbosity - 1;
  } else if (feedback.signal === "too_short") {
    newVerbosity = currentVerbosity + 1;
  } else if (feedback.rating === "down" && !feedback.signal) {
    // Generic thumbs-down: nudge verbosity down by 1 as a safe default
    newVerbosity = currentVerbosity - 1;
  }

  newVerbosity = clampVerbosity(newVerbosity);

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
 * All values are clamped/sanitized on read.
 */
export function buildStyleInstructions(
  profile: LoopbrainUserProfile | null,
): string {
  if (!profile) return "";

  const lines: string[] = ["## User Preferences"];

  // Tone — validate on read
  const tone = validateTone(profile.tone);
  if (tone !== "balanced") {
    lines.push(`- Tone: ${tone}`);
  }

  // Verbosity — clamp on read
  const verbosity = clampVerbosity(profile.verbosity);
  const label = VERBOSITY_LABELS[verbosity] ?? VERBOSITY_LABELS[3];
  lines.push(`- Verbosity: ${verbosity}/5 (${label})`);

  // Formatting — sanitize on read
  const fmt = sanitizeFormatting(profile.formatting);
  const parts: string[] = [];
  if (fmt.bullets) parts.push("use bullet lists");
  if (fmt.headings) parts.push("use section headings");
  if (fmt.checklists) parts.push("use checklists where appropriate");
  if (parts.length > 0) {
    lines.push(`- Formatting: ${parts.join(", ")}`);
  }

  // Focus projects — sanitize on read
  const focusIds = sanitizeFocusProjectIds(profile.focusProjectIds);
  if (focusIds.length > 0) {
    lines.push(
      `- Focus projects (prioritize context from these): ${focusIds.join(", ")}`,
    );
  }

  return lines.join("\n");
}
