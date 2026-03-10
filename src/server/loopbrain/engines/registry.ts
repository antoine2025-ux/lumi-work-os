/**
 * Proactive Engine Registry — generalized job runner framework.
 *
 * This is a higher-level registry separate from the scope-specific
 * LoopBrainEngine registry (src/server/loopbrain/registry.ts) which
 * handles individual engine selection. This registry maps engine keys
 * to top-level run functions that can be triggered by cron or internal API.
 *
 * SAFETY CONTRACT:
 * Engines must only write OrgSuggestionRun / LoopBrainOutcome records.
 * They must NEVER perform direct data mutations (e.g. updating positions,
 * deleting records, sending notifications). Enforcement is by convention
 * and code review.
 */

import { runPeopleIssuesSuggestionsForOrg } from "../runPeopleIssuesSuggestions";
import {
  scanProjectHealth,
  persistProjectHealthAlerts,
  createCriticalAlertNotifications,
} from "@/lib/loopbrain/scenarios/project-health-scanner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProactiveEngineResult =
  | {
      ok: true;
      suggestionRunId: string;
      suggestionCount: number;
      engineId: string;
    }
  | {
      ok: false;
      skipped?: boolean;
      reason?: string;
      error?: string;
    };

export interface ProactiveEngine {
  /** Unique key used in API calls and logging */
  key: string;
  /** Human-readable label */
  label: string;
  /**
   * Run the engine for a single workspace.
   * Must only write OrgSuggestionRun / LoopBrainOutcome records — no direct mutations.
   */
  run: (args: {
    workspaceId: string;
  }) => Promise<ProactiveEngineResult>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const engines = new Map<string, ProactiveEngine>();

export function registerProactiveEngine(engine: ProactiveEngine): void {
  if (engines.has(engine.key)) {
    console.warn(
      `[proactive-registry] Engine "${engine.key}" already registered; overwriting.`,
    );
  }
  engines.set(engine.key, engine);
}

export function getProactiveEngine(key: string): ProactiveEngine | undefined {
  return engines.get(key);
}

export function listProactiveEngines(): Array<{ key: string; label: string }> {
  return Array.from(engines.values()).map((e) => ({
    key: e.key,
    label: e.label,
  }));
}

// ---------------------------------------------------------------------------
// Built-in engine registrations
// ---------------------------------------------------------------------------

registerProactiveEngine({
  key: "people_issues",
  label: "People Issues Detection",
  run: async ({ workspaceId }) => {
    const result = await runPeopleIssuesSuggestionsForOrg({ workspaceId });

    if (result.ok) {
      return {
        ok: true,
        suggestionRunId: result.suggestionRunId,
        suggestionCount: result.suggestionCount,
        engineId: result.engineId,
      };
    }

    if ("skipped" in result && result.skipped) {
      return { ok: false, skipped: true, reason: result.reason };
    }

    return { ok: false, error: "error" in result ? result.error : "Unknown error" };
  },
});

// ---------------------------------------------------------------------------
// Project Health Scanner engine
// Writes to ProactiveInsight (Loopbrain intelligence layer) + Notification.
// This intentionally deviates from the "OrgSuggestionRun only" safety note
// above — ProactiveInsight is the correct storage model for this engine.
// ---------------------------------------------------------------------------

registerProactiveEngine({
  key: "project_health",
  label: "Project Health Scanner",
  run: async ({ workspaceId }) => {
    const alerts = await scanProjectHealth(workspaceId);
    const { created, updated, resolved } = await persistProjectHealthAlerts(
      workspaceId,
      alerts
    );

    const newCritical = created.filter((a) => a.severity === "critical");
    if (newCritical.length > 0) {
      await createCriticalAlertNotifications(workspaceId, newCritical);
    }

    return {
      ok: true,
      suggestionRunId: `project_health_${Date.now()}`,
      suggestionCount: created.length + updated,
      engineId: "project_health",
    };
  },
});
