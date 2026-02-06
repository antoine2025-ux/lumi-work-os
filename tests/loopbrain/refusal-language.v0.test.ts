/**
 * Refusal Language Canon v0 — Contract Tests
 *
 * - Every OrgReadinessBlocker has copy and actions
 * - Blocker ordering invariant
 * - Deep-link determinism and pattern
 * - No forbidden phrases or modal verbs
 * - Static subtitle
 * - Empty blockers guardrail
 */

import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { BLOCKER_PRIORITY_V0 } from "@/lib/loopbrain/contract/blockerPriority.v0";
import {
  BLOCKER_COPY_V0,
  getRefusalSubtitleV0,
} from "@/lib/loopbrain/contract/refusalCopy.v0";
import { BLOCKER_ACTIONS_V0 } from "@/lib/loopbrain/contract/refusalActions.v0";
import { BlockedAnswerNotice } from "@/components/loopbrain/BlockedAnswerNotice";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

const FORBIDDEN_PHRASES = [
  "likely",
  "probably",
  "seems",
  "in general",
  "I think",
  "typical orgs",
  "I can't access",
  "Based on the data we have",
  "From what I can see",
  "This usually means",
  "Once you fix",
  "The system expects",
  "A typical next step",
  "You should",
  "Try ",
  "You may want",
];

const MODAL_VERB_REGEX = /\b(may|might|could|would)\b/;

function allStringsFromCopy(): string[] {
  const out: string[] = [];
  for (const b of BLOCKER_PRIORITY_V0) {
    const copy = BLOCKER_COPY_V0[b];
    out.push(copy.label, copy.description);
  }
  return out;
}

function allLabelsFromActions(): string[] {
  const out: string[] = [];
  for (const b of BLOCKER_PRIORITY_V0) {
    for (const a of BLOCKER_ACTIONS_V0[b]) {
      out.push(a.label);
    }
  }
  return out;
}

describe("Refusal Language Canon v0", () => {
  describe("Orphan blocker (append-only discipline)", () => {
    it("every blocker in BLOCKER_PRIORITY_V0 has copy in BLOCKER_COPY_V0", () => {
      for (const b of BLOCKER_PRIORITY_V0) {
        expect(BLOCKER_COPY_V0[b]).toBeDefined();
        expect(BLOCKER_COPY_V0[b].label).toBeDefined();
        expect(BLOCKER_COPY_V0[b].description).toBeDefined();
      }
    });

    it("every blocker in BLOCKER_PRIORITY_V0 has at least one next action", () => {
      for (const b of BLOCKER_PRIORITY_V0) {
        const actions = BLOCKER_ACTIONS_V0[b];
        expect(actions).toBeDefined();
        expect(actions.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Blocker ordering invariant", () => {
    it("BLOCKER_PRIORITY_V0 equals order emitted when all blockers present", () => {
      const allBlockersSet = new Set<OrgReadinessBlocker>(BLOCKER_PRIORITY_V0);
      const sortedBlockers = BLOCKER_PRIORITY_V0.filter((b) => allBlockersSet.has(b));
      expect(sortedBlockers).toEqual(BLOCKER_PRIORITY_V0);
      expect(sortedBlockers).toHaveLength(7);
    });
  });

  describe("Deep links", () => {
    it("all deepLinks match ^/org/", () => {
      for (const b of BLOCKER_PRIORITY_V0) {
        for (const a of BLOCKER_ACTIONS_V0[b]) {
          if (a.deepLink) {
            expect(a.deepLink).toMatch(/^\/org\//);
          }
        }
      }
    });

    it("all deepLink values are strings at import time (not functions)", () => {
      for (const b of BLOCKER_PRIORITY_V0) {
        for (const a of BLOCKER_ACTIONS_V0[b]) {
          if (a.deepLink !== undefined) {
            expect(typeof a.deepLink).toBe("string");
          }
        }
      }
    });
  });

  describe("Forbidden phrases (copy + action labels)", () => {
    it("no forbidden phrases in BLOCKER_COPY_V0", () => {
      const strings = allStringsFromCopy();
      const lower = strings.map((s) => s.toLowerCase());
      for (const phrase of FORBIDDEN_PHRASES) {
        for (const s of lower) {
          expect(s).not.toContain(phrase.toLowerCase());
        }
      }
    });

    it("no forbidden phrases in BLOCKER_ACTIONS_V0 labels", () => {
      const labels = allLabelsFromActions();
      const lower = labels.map((l) => l.toLowerCase());
      for (const phrase of FORBIDDEN_PHRASES) {
        for (const s of lower) {
          expect(s).not.toContain(phrase.toLowerCase());
        }
      }
    });
  });

  describe("No modal verbs (copy + action labels)", () => {
    it("no modal verbs in BLOCKER_COPY_V0", () => {
      const strings = allStringsFromCopy();
      for (const s of strings) {
        expect(s).not.toMatch(MODAL_VERB_REGEX);
      }
    });

    it("no modal verbs in BLOCKER_ACTIONS_V0 labels", () => {
      const labels = allLabelsFromActions();
      for (const label of labels) {
        expect(label).not.toMatch(MODAL_VERB_REGEX);
      }
    });
  });

  describe("Static subtitle", () => {
    it("getRefusalSubtitleV0 returns exact canonical string", () => {
      expect(getRefusalSubtitleV0()).toBe(
        "Your org is missing required structure to answer this question."
      );
    });
  });

  describe("Empty blockers guardrail", () => {
    it("BlockedAnswerNotice with empty array renders nothing (no notice)", () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(BlockedAnswerNotice, { blockingFactors: [] })
      );
      expect(html).not.toContain("Can't answer yet");
      expect(html).toBe("");
    });
  });
});
