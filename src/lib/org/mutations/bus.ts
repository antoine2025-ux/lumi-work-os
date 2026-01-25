/**
 * Mutation Bus (Client-Side Singleton)
 *
 * Simple event bus for mutation notifications.
 * Provides minimal, stable event envelope (not full MutationResult).
 * Includes deduplication to prevent double-apply from React strict mode, retries, or accidental double-calls.
 */

import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import type { ResolvedIssueDelta, MutationScope } from "./types";

/**
 * Minimal, stable mutation event envelope.
 * Not the full MutationResult - only fields needed for UI updates.
 */
export type OrgMutationEvent = {
  mutationId: string;
  eventAt: string; // Bus emission timestamp (new, preferred)
  resolvedAt: string; // @deprecated Use eventAt instead. Kept for backward compatibility.
  affectedIssues: {
    active: OrgIssueMetadata[];
    resolved: ResolvedIssueDelta[];
  };
  scope: MutationScope;
  // Optional: patch type names, not full patch payload
  patchType?: "OwnershipPatch" | "CapacityPatch" | "WorkPatch";
};

type MutationListener = (event: OrgMutationEvent) => void;

/**
 * Singleton mutation bus.
 * 
 * Rules:
 * - No React dependency (pure JS)
 * - Singleton pattern (one instance per runtime)
 * - Testable (can mock/replace in tests)
 * - Avoids window events (multiple tabs, hydration boundaries)
 * - Deduplication by mutationId prevents double-apply
 */
class MutationBus {
  private listeners: Set<MutationListener> = new Set();
  private seenMutationIds: Set<string> = new Set();
  private readonly MAX_SEEN_IDS = 100; // Keep last ~100 IDs

  subscribe(listener: MutationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: OrgMutationEvent): void {
    // Guard against duplicate emissions (React strict mode, retries, accidental double-calls)
    if (this.seenMutationIds.has(event.mutationId)) {
      return; // Already processed this mutation
    }

    // Track this mutation ID
    this.seenMutationIds.add(event.mutationId);

    // Prune old IDs if we exceed max
    if (this.seenMutationIds.size > this.MAX_SEEN_IDS) {
      const idsArray = Array.from(this.seenMutationIds);
      const toRemove = idsArray.slice(0, idsArray.length - this.MAX_SEEN_IDS);
      toRemove.forEach((id) => this.seenMutationIds.delete(id));
    }

    // Notify all listeners
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const mutationBus = new MutationBus();
