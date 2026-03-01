export type LoopBrainContext = {
  workspaceId: string;
  scope: string;
};

export type LoopBrainSuggestion = {
  personId: string;
  patch: Record<string, unknown>;
  confidence: number;
  rationale: string;
  evidence?: Array<{ label: string; value: string }>;
};

export interface PersonRecord {
  id: string;
  managerId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  team?: string | null;
  role?: string | null;
  title?: string | null;
  [key: string]: unknown;
}

export interface LoopBrainEngine {
  id: string;
  scope: string;
  run(args: {
    context: LoopBrainContext;
    people: PersonRecord[];
    allPeople: PersonRecord[];
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

