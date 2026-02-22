import type { LoopBrainEngine } from "./engine";
import { computeSuggestionsBatch } from "./suggestions";

export const heuristicEngine: LoopBrainEngine = {
  id: "heuristic-v1",
  scope: "people_issues",
  async run({ people, allPeople: _allPeople }) {
    return computeSuggestionsBatch({ people }).map((s) => ({
      personId: s.personId,
      patch: s.patch,
      confidence: s.confidence,
      rationale: s.rationale,
      evidence: s.evidence,
    }));
  },
};

