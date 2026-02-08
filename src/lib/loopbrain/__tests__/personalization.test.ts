/**
 * Loopbrain Personalization — unit tests.
 *
 * Pure-function tests (no DB, no mocking).
 * Covers: clampVerbosity, sanitizeFormatting, validateTone,
 *         buildStyleInstructions, buildPersonalizedSystemPrompt.
 */

import { describe, it, expect } from "vitest";
import {
  clampVerbosity,
  sanitizeFormatting,
  validateTone,
  buildStyleInstructions,
  VALID_TONES,
  type FormattingPrefs,
} from "../personalization/profile";
import { buildPersonalizedSystemPrompt } from "../personalization/systemPrompt";
import type { LoopbrainUserProfile } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock profile for testing buildStyleInstructions. */
function mockProfile(
  overrides: Partial<LoopbrainUserProfile> = {},
): LoopbrainUserProfile {
  return {
    id: "test-id",
    workspaceId: "ws-1",
    userId: "user-1",
    tone: "balanced",
    verbosity: 3,
    formatting: {},
    focusProjectIds: [],
    updatedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// clampVerbosity
// ---------------------------------------------------------------------------

describe("clampVerbosity", () => {
  it("returns 1 for values below minimum", () => {
    expect(clampVerbosity(0)).toBe(1);
    expect(clampVerbosity(-5)).toBe(1);
  });

  it("returns 5 for values above maximum", () => {
    expect(clampVerbosity(6)).toBe(5);
    expect(clampVerbosity(100)).toBe(5);
  });

  it("rounds fractional values", () => {
    expect(clampVerbosity(3.7)).toBe(4);
    expect(clampVerbosity(2.3)).toBe(2);
    expect(clampVerbosity(1.5)).toBe(2);
  });

  it("passes through valid integers unchanged", () => {
    expect(clampVerbosity(1)).toBe(1);
    expect(clampVerbosity(3)).toBe(3);
    expect(clampVerbosity(5)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// sanitizeFormatting
// ---------------------------------------------------------------------------

describe("sanitizeFormatting", () => {
  it("returns empty object for null/undefined", () => {
    expect(sanitizeFormatting(null)).toEqual({});
    expect(sanitizeFormatting(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(sanitizeFormatting("hello")).toEqual({});
    expect(sanitizeFormatting(42)).toEqual({});
  });

  it("passes through valid boolean keys", () => {
    const input: FormattingPrefs = { bullets: true, headings: false, checklists: true };
    expect(sanitizeFormatting(input)).toEqual(input);
  });

  it("strips unknown keys", () => {
    const input = { bullets: true, headings: false, evil: "payload", extra: 123 };
    expect(sanitizeFormatting(input)).toEqual({ bullets: true, headings: false });
  });

  it("strips non-boolean values for known keys", () => {
    const input = { bullets: "yes", headings: 1, checklists: true };
    expect(sanitizeFormatting(input)).toEqual({ checklists: true });
  });

  it("rejects oversized input", () => {
    const huge = { bullets: true, headings: true, checklists: true };
    // Pad with a large extra key to blow past 256 bytes
    const bloated = { ...huge, data: "x".repeat(300) };
    expect(sanitizeFormatting(bloated)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// validateTone
// ---------------------------------------------------------------------------

describe("validateTone", () => {
  it("returns valid tones unchanged", () => {
    for (const tone of VALID_TONES) {
      expect(validateTone(tone)).toBe(tone);
    }
  });

  it("defaults to 'balanced' for invalid string", () => {
    expect(validateTone("aggressive")).toBe("balanced");
    expect(validateTone("")).toBe("balanced");
  });

  it("defaults to 'balanced' for non-string input", () => {
    expect(validateTone(42)).toBe("balanced");
    expect(validateTone(null)).toBe("balanced");
    expect(validateTone(undefined)).toBe("balanced");
  });
});

// ---------------------------------------------------------------------------
// buildStyleInstructions
// ---------------------------------------------------------------------------

describe("buildStyleInstructions", () => {
  it("returns empty string for null profile", () => {
    expect(buildStyleInstructions(null)).toBe("");
  });

  it("includes verbosity line for default profile", () => {
    const result = buildStyleInstructions(mockProfile());
    expect(result).toContain("## User Preferences");
    expect(result).toContain("Verbosity: 3/5");
    expect(result).toContain("balanced");
  });

  it("includes tone when not balanced", () => {
    const result = buildStyleInstructions(mockProfile({ tone: "formal" }));
    expect(result).toContain("Tone: formal");
  });

  it("omits tone line when balanced", () => {
    const result = buildStyleInstructions(mockProfile({ tone: "balanced" }));
    expect(result).not.toContain("Tone:");
  });

  it("clamps out-of-range verbosity on read", () => {
    const result = buildStyleInstructions(mockProfile({ verbosity: 99 }));
    expect(result).toContain("Verbosity: 5/5");
  });

  it("clamps negative verbosity on read", () => {
    const result = buildStyleInstructions(mockProfile({ verbosity: -1 }));
    expect(result).toContain("Verbosity: 1/5");
  });

  it("includes formatting instructions", () => {
    const result = buildStyleInstructions(
      mockProfile({ formatting: { bullets: true, checklists: true } }),
    );
    expect(result).toContain("use bullet lists");
    expect(result).toContain("use checklists");
  });

  it("sanitizes invalid formatting on read", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badFormatting = { bullets: true, evil: "payload" } as any;
    const result = buildStyleInstructions(mockProfile({ formatting: badFormatting }));
    expect(result).toContain("use bullet lists");
    expect(result).not.toContain("evil");
  });

  it("includes focus project IDs", () => {
    const result = buildStyleInstructions(
      mockProfile({ focusProjectIds: ["proj-1", "proj-2"] }),
    );
    expect(result).toContain("proj-1");
    expect(result).toContain("proj-2");
  });

  it("caps focus project IDs at 20", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `proj-${i}`);
    const result = buildStyleInstructions(mockProfile({ focusProjectIds: ids }));
    expect(result).toContain("proj-19");
    expect(result).not.toContain("proj-20");
  });

  it("validates tone on read — invalid tone is ignored", () => {
    const result = buildStyleInstructions(
      mockProfile({ tone: "aggressive" }),
    );
    // "aggressive" is not valid, validateTone returns "balanced", which is omitted
    expect(result).not.toContain("Tone:");
  });
});

// ---------------------------------------------------------------------------
// buildPersonalizedSystemPrompt
// ---------------------------------------------------------------------------

describe("buildPersonalizedSystemPrompt", () => {
  it("returns default system prompt when no style instructions", () => {
    const result = buildPersonalizedSystemPrompt({ styleInstructions: "" });
    expect(result).toBe(
      "You are Loopbrain, Loopwell's Virtual COO assistant.",
    );
  });

  it("returns base prompt when no style instructions", () => {
    const result = buildPersonalizedSystemPrompt({
      basePrompt: "Custom base.",
      styleInstructions: "",
    });
    expect(result).toBe("Custom base.");
  });

  it("appends style instructions to default prompt", () => {
    const result = buildPersonalizedSystemPrompt({
      styleInstructions: "## User Preferences\n- Verbosity: 2/5",
    });
    expect(result).toContain("Virtual COO assistant.");
    expect(result).toContain("## User Preferences");
    expect(result).toContain("Verbosity: 2/5");
  });

  it("appends style instructions to custom base prompt", () => {
    const result = buildPersonalizedSystemPrompt({
      basePrompt: "You are an org expert.",
      styleInstructions: "- Tone: formal",
    });
    expect(result).toBe("You are an org expert.\n\n- Tone: formal");
  });
});
