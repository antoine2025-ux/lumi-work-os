export type LoopBrainContext = {
  orgId: string;
  scope: string;
};

export type LoopBrainSuggestion = {
  personId: string;
  patch: Record<string, any>;
  confidence: number;
  rationale: string;
  evidence?: Array<{ label: string; value: string }>;
};

export interface LoopBrainEngine {
  id: string;
  scope: string;
  run(args: {
    context: LoopBrainContext;
    people: any[];
    allPeople: any[];
  }): Promise<LoopBrainSuggestion[]>;
}

let activeEngine: LoopBrainEngine | null = null;

export function registerEngine(engine: LoopBrainEngine) {
  activeEngine = engine;
}

export function getActiveEngine(): LoopBrainEngine {
  if (!activeEngine) {
    throw new Error("No LoopBrain engine registered");
  }
  return activeEngine;
}

