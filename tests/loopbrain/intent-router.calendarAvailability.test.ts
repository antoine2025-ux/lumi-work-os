/**
 * Intent Router Tests — Calendar Availability
 *
 * Tests the deterministic keyword detection for the calendar_availability intent type.
 */

import { describe, it, expect } from "vitest";
import { detectIntentFromKeywords } from "@/lib/loopbrain/intent-router";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .filter(
      (t) =>
        !new Set([
          "the", "a", "an", "and", "or", "to", "of", "in", "on", "for",
          "with", "is", "are", "was", "were", "be", "been", "being",
          "have", "has", "had", "do", "does", "did", "will", "would",
          "should", "could", "may", "might", "must", "can", "this", "that",
          "these", "those", "what", "which", "who", "whom", "where", "when",
          "why", "how",
        ]).has(t)
    );
}

function detectIntent(query: string) {
  const q = query.toLowerCase();
  return detectIntentFromKeywords(q, tokenize(q));
}

// ---------------------------------------------------------------------------
// Calendar Availability Intent Detection
// ---------------------------------------------------------------------------

describe("Intent Router — Calendar Availability", () => {
  const calendarQueries = [
    "when am i free tomorrow?",
    "find time for a meeting with alice",
    "schedule a meeting next tuesday",
    "is bob available this week?",
    "when are you free for a sync?",
    "available slot for a 1:1?",
    "find a free slot this afternoon",
    "calendar availability for the team",
    "when is the next open slot?",
    "meeting time for sprint planning",
  ];

  it.each(calendarQueries)(
    "detects '%s' as calendar_availability",
    (query) => {
      const result = detectIntent(query);
      expect(result.intent).toBe("calendar_availability");
    }
  );

  it("has confidence >= 0.8 for calendar availability queries", () => {
    const result = detectIntent("when am i free tomorrow?");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

// ---------------------------------------------------------------------------
// Non-matching queries should NOT trigger calendar_availability
// ---------------------------------------------------------------------------

describe("Intent Router — Calendar Non-matching Queries", () => {
  const nonMatchingQueries = [
    "what tasks do I have?",
    "who owns the pricing domain?",
    "summarize the wiki page",
    "what are the company goals?",
    "how healthy is the project?",
    "what is my workload?",
  ];

  it.each(nonMatchingQueries)(
    "'%s' should NOT be calendar_availability",
    (query) => {
      const result = detectIntent(query);
      expect(result.intent).not.toBe("calendar_availability");
    }
  );
});
