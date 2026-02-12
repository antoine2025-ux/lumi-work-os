/**
 * BlockedAnswerNotice — Loopbrain contract renderer for BLOCKED answers
 *
 * Renders canonical refusal structure: title + subtitle + blockers + next actions.
 * Only input allowed: blockingFactors. Must NOT read snapshot, issues, or coverage metrics.
 *
 * Invariants:
 * - No tooltips, expandable, hover, or "Why?" links. Only CTA links.
 * - Truncation is presentation-only; does not alter blockingFactors.
 * - Rendering with zero blockers is a contract violation (returns null).
 */

"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";
import { BLOCKER_PRIORITY_V0 } from "@/lib/loopbrain/contract/blockerPriority.v0";
import {
  getRefusalTitleV0,
  getRefusalSubtitleV0,
  BLOCKER_COPY_V0,
} from "@/lib/loopbrain/contract/refusalCopy.v0";
import { BLOCKER_ACTIONS_V0 } from "@/lib/loopbrain/contract/refusalActions.v0";

const MAX_ACTIONS_RENDERED = 3;

function deduplicateActions(
  blockingFactors: OrgReadinessBlocker[]
): { label: string; deepLink?: string }[] {
  const seen = new Set<string>();
  const result: { label: string; deepLink?: string }[] = [];

  // Order: highest-priority blocker first (blockingFactors already sorted by caller, or we sort by BLOCKER_PRIORITY_V0)
  const sortedBlockers = BLOCKER_PRIORITY_V0.filter((b) =>
    blockingFactors.includes(b)
  );

  for (const b of sortedBlockers) {
    for (const action of BLOCKER_ACTIONS_V0[b]) {
      const key = `${action.label}|${action.deepLink ?? ""}`;
      if (!seen.has(key) && result.length < MAX_ACTIONS_RENDERED) {
        seen.add(key);
        result.push(action);
      }
    }
  }

  return result;
}

export function BlockedAnswerNotice({
  blockingFactors,
  maxItems = 3,
}: {
  blockingFactors: OrgReadinessBlocker[];
  maxItems?: number;
}) {
  // Contract violation: zero blockers
  if (blockingFactors.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[BlockedAnswerNotice] Contract violation: blockingFactors.length === 0"
      );
    }
    return null;
  }

  const title = getRefusalTitleV0();
  const subtitle = getRefusalSubtitleV0();

  // Sort by BLOCKER_PRIORITY_V0; truncate display only (do not mutate blockingFactors)
  const sortedBlockers = BLOCKER_PRIORITY_V0.filter((b) =>
    blockingFactors.includes(b)
  );
  const displayBlockers = sortedBlockers.slice(0, maxItems);

  const actions = deduplicateActions(blockingFactors);

  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <div className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-amber-100">
                {title}
              </span>
              <p className="mt-1 text-xs text-amber-200/90">{subtitle}</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                {displayBlockers.map((b) => (
                  <li key={b}>• {BLOCKER_COPY_V0[b].description}</li>
                ))}
              </ul>
            </div>
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <OrgPrimaryCta key={i} size="sm" asChild>
                  <Link href={a.deepLink ?? "/org/admin/health"}>
                    {a.label}
                  </Link>
                </OrgPrimaryCta>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
