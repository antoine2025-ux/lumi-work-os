/**
 * Intent Router Tests — Project Health & Workload Analysis
 *
 * Tests the deterministic keyword detection for the new intent types.
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
// Project Health Intent Detection
// ---------------------------------------------------------------------------

describe("Intent Router — Project Health", () => {
  const projectHealthQueries = [
    "what is the project health?",
    "how healthy is the project?",
    "project velocity this sprint",
    "are there any project bottlenecks?",
    "project momentum trends",
    "what is the project risk?",
    "sprint velocity for this project",
    "project health overview",
    "is the project on track for delivery?",
    "project is doing well?",
  ];

  it.each(projectHealthQueries)(
    "detects '%s' as project_health",
    (query) => {
      const result = detectIntent(query);
      expect(result.intent).toBe("project_health");
    }
  );

  it("has confidence >= 0.8 for project health queries", () => {
    const result = detectIntent("what is the project health?");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

// ---------------------------------------------------------------------------
// Workload Analysis Intent Detection
// ---------------------------------------------------------------------------

describe("Intent Router — Workload Analysis", () => {
  const workloadQueries = [
    "what is alice's workload?",
    "is the team overloaded?",
    "workload distribution across the team",
    "who is overloaded right now?",
    "am i spread too thin?",
    "check team workload balance",
    "workload analysis for the engineering team",
    "too much work on my plate",
    "how busy is the team?",
    "task load for this sprint",
  ];

  it.each(workloadQueries)(
    "detects '%s' as workload_analysis",
    (query) => {
      const result = detectIntent(query);
      expect(result.intent).toBe("workload_analysis");
    }
  );

  it("has confidence >= 0.8 for workload queries", () => {
    const result = detectIntent("what is my workload?");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

// ---------------------------------------------------------------------------
// Non-matching queries should NOT trigger these intents
// ---------------------------------------------------------------------------

describe("Intent Router — Non-matching Queries", () => {
  const nonMatchingQueries = [
    "what tasks do I have?",
    "who owns the pricing domain?",
    "summarize the wiki page",
    "what are the company goals?",
  ];

  it.each(nonMatchingQueries)(
    "'%s' should NOT be project_health or workload_analysis",
    (query) => {
      const result = detectIntent(query);
      expect(result.intent).not.toBe("project_health");
      expect(result.intent).not.toBe("workload_analysis");
    }
  );
});
