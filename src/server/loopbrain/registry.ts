import type { LoopBrainEngine } from "./engine";
import { heuristicEngine } from "./heuristicEngine";

const engines: LoopBrainEngine[] = [heuristicEngine];

export function listEngines() {
  return engines.map((e) => ({ id: e.id, scope: e.scope }));
}

export function getEngineById(id: string) {
  return engines.find((e) => e.id === id) || null;
}

export function getFallbackEngineForScope(scope: string) {
  // For now, heuristic is the safe fallback
  const e = engines.find((x) => x.scope === scope && x.id === "heuristic-v1");
  return e || engines.find((x) => x.scope === scope) || null;
}

