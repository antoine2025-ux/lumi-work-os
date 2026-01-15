/**
 * Org Intelligence Context Integration
 * 
 * Phase 5: Integrates intelligence signals into LoopBrain context objects
 * for AI reasoning about org health and risks.
 */

import { ContextObject } from "@/lib/context/contextTypes";
import {
  computeOrgIntelligence,
  OrgIntelligenceResult,
  getLatestIntelligenceSnapshot,
  saveIntelligenceSnapshot,
} from "./computeOrgIntelligence";
import {
  LoopBrainEvent,
  getSignalDescription,
  sortEventsBySeverity,
} from "@/lib/loopbrain/signals";

/**
 * Intelligence context for LoopBrain prompt building
 */
export type OrgIntelligenceContext = {
  hasIntelligence: boolean;
  signalCount: number;
  criticalCount: number;
  highPriorityCount: number;
  
  // Formatted for LLM consumption
  summaryText: string;
  signalDetails: string[];
  
  // Raw data for structured access
  signals: LoopBrainEvent[];
  computedAt: Date;
};

/**
 * Get intelligence context for LoopBrain
 * 
 * Uses cached snapshot if fresh, otherwise computes new intelligence.
 */
export async function getOrgIntelligenceContext(
  workspaceId: string,
  options?: {
    maxAge?: number; // Max age in minutes before recomputing
    forceRefresh?: boolean;
  }
): Promise<OrgIntelligenceContext> {
  const maxAge = options?.maxAge ?? 60; // Default 1 hour
  const forceRefresh = options?.forceRefresh ?? false;

  let result: OrgIntelligenceResult | null = null;

  // Try to use cached snapshot
  if (!forceRefresh) {
    const snapshot = await getLatestIntelligenceSnapshot(workspaceId);
    if (snapshot) {
      const ageMinutes = (Date.now() - snapshot.computedAt.getTime()) / (1000 * 60);
      if (ageMinutes < maxAge) {
        result = snapshot;
      }
    }
  }

  // Compute fresh if needed
  if (!result) {
    result = await computeOrgIntelligence(workspaceId);
    // Save snapshot for future use
    await saveIntelligenceSnapshot(workspaceId, result, "on_demand");
  }

  return formatIntelligenceForContext(result);
}

/**
 * Format intelligence result for LoopBrain context
 */
function formatIntelligenceForContext(
  result: OrgIntelligenceResult
): OrgIntelligenceContext {
  const sortedSignals = sortEventsBySeverity(result.signals);
  
  const criticalCount = sortedSignals.filter(s => s.severity === "critical").length;
  const highPriorityCount = sortedSignals.filter(s => s.severity === "high").length;
  
  // Build summary text for LLM
  const summaryParts: string[] = [];
  
  if (result.signals.length === 0) {
    summaryParts.push("No org intelligence signals detected. The organization appears healthy.");
  } else {
    summaryParts.push(`Detected ${result.signals.length} org intelligence signals.`);
    
    if (criticalCount > 0) {
      summaryParts.push(`${criticalCount} critical issue(s) requiring immediate attention.`);
    }
    if (highPriorityCount > 0) {
      summaryParts.push(`${highPriorityCount} high priority issue(s).`);
    }
    
    // Add top issues
    if (result.summary.topIssues.length > 0) {
      summaryParts.push("Top issues:");
      for (const issue of result.summary.topIssues.slice(0, 3)) {
        summaryParts.push(`- ${issue.description}: ${issue.count} occurrence(s)`);
      }
    }
  }
  
  // Format signal details for LLM
  const signalDetails = sortedSignals.slice(0, 20).map(signal => {
    const parts = [
      `[${signal.severity.toUpperCase()}]`,
      getSignalDescription(signal.type),
    ];
    
    if (signal.metadata?.suggestedAction) {
      parts.push(`Action: ${signal.metadata.suggestedAction}`);
    }
    
    return parts.join(" - ");
  });

  return {
    hasIntelligence: result.signals.length > 0,
    signalCount: result.signals.length,
    criticalCount,
    highPriorityCount,
    summaryText: summaryParts.join(" "),
    signalDetails,
    signals: sortedSignals,
    computedAt: result.computedAt,
  };
}

/**
 * Build intelligence section for LoopBrain prompt
 */
export function buildIntelligencePromptSection(
  context: OrgIntelligenceContext
): string {
  const sections: string[] = [];
  
  sections.push("## Org Intelligence Signals");
  sections.push("");
  sections.push(context.summaryText);
  sections.push("");
  
  if (context.signalDetails.length > 0) {
    sections.push("### Active Signals:");
    for (const detail of context.signalDetails) {
      sections.push(`- ${detail}`);
    }
    sections.push("");
  }
  
  sections.push("### How to use this information:");
  sections.push("- When asked about org health, reference these signals");
  sections.push("- When asked about risks, explain the critical and high priority issues");
  sections.push("- When asked why something is flagged, use the signal descriptions");
  sections.push("- Suggest actions based on the suggested actions in the signals");
  sections.push("");
  
  return sections.join("\n");
}

/**
 * Add intelligence metadata to org root context object
 */
export function enrichOrgContextWithIntelligence(
  orgContext: ContextObject,
  intelligence: OrgIntelligenceContext
): ContextObject {
  const newTags = [...orgContext.tags];
  
  // Add intelligence tags
  newTags.push(`org_signals:${intelligence.signalCount}`);
  newTags.push(`org_critical:${intelligence.criticalCount}`);
  newTags.push(`org_high:${intelligence.highPriorityCount}`);
  
  if (intelligence.criticalCount > 0) {
    newTags.push("org_status:critical");
  } else if (intelligence.highPriorityCount > 0) {
    newTags.push("org_status:attention_needed");
  } else if (intelligence.signalCount > 0) {
    newTags.push("org_status:minor_issues");
  } else {
    newTags.push("org_status:healthy");
  }
  
  // Enhance summary
  const intelligenceSummary = intelligence.signalCount > 0
    ? ` Intelligence: ${intelligence.signalCount} signal(s), ${intelligence.criticalCount} critical.`
    : " Intelligence: No issues detected.";
  
  return {
    ...orgContext,
    summary: orgContext.summary + intelligenceSummary,
    tags: newTags,
  };
}

/**
 * Get signals for a specific entity
 */
export function getSignalsForEntity(
  context: OrgIntelligenceContext,
  entityId: string
): LoopBrainEvent[] {
  return context.signals.filter(s => s.entityId === entityId);
}

/**
 * Get signals by type
 */
export function getSignalsByType(
  context: OrgIntelligenceContext,
  type: string
): LoopBrainEvent[] {
  return context.signals.filter(s => s.type === type);
}

/**
 * Check if there are critical issues
 */
export function hasCriticalIssues(context: OrgIntelligenceContext): boolean {
  return context.criticalCount > 0;
}

/**
 * Get actionable summary for quick display
 */
export function getActionableSummary(context: OrgIntelligenceContext): {
  status: "healthy" | "attention" | "critical";
  label: string;
  topAction?: string;
} {
  if (context.criticalCount > 0) {
    const criticalSignal = context.signals.find(s => s.severity === "critical");
    return {
      status: "critical",
      label: `${context.criticalCount} critical issue(s)`,
      topAction: criticalSignal?.metadata?.suggestedAction as string | undefined,
    };
  }
  
  if (context.highPriorityCount > 0) {
    const highSignal = context.signals.find(s => s.severity === "high");
    return {
      status: "attention",
      label: `${context.highPriorityCount} issue(s) need attention`,
      topAction: highSignal?.metadata?.suggestedAction as string | undefined,
    };
  }
  
  if (context.signalCount > 0) {
    return {
      status: "attention",
      label: `${context.signalCount} minor issue(s)`,
    };
  }
  
  return {
    status: "healthy",
    label: "Organization is healthy",
  };
}

