"use client";

import React, { useEffect, useState, useMemo } from "react";
import { buildIssueRows } from "../people/_components/IssuesModel";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";

type Guidance = {
  key: string;
  label: string;
  description: string;
  issueType: string;
  count: number;
  impactSum?: number; // Impact-weighted sum for prioritization
};

export function OrgGuidancePanel({
  people = [],
  signals = [],
}: {
  people?: any[];
  signals?: LoopBrainEvent[];
}) {
  const [items, setItems] = useState<Guidance[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute impact-weighted guidance from signals if available
  const impactBasedGuidance = useMemo(() => {
    if (people.length === 0 || signals.length === 0) return null;

    const issueRows = buildIssueRows({ people, signals });
    
    // Group by issue type and sum impact scores
    const byType = new Map<string, { count: number; impactSum: number }>();
    
    for (const row of issueRows) {
      for (const issueType of row.issueTypes) {
        const existing = byType.get(issueType) || { count: 0, impactSum: 0 };
        existing.count += 1;
        existing.impactSum += row.impactScore;
        byType.set(issueType, existing);
      }
    }

    // Map to guidance format
    const guidance: Guidance[] = [];
    
    if (byType.has("MISSING_MANAGER")) {
      const data = byType.get("MISSING_MANAGER")!;
      const avgImpact = data.impactSum / data.count;
      const impactLevel = avgImpact >= 7 ? "high" : avgImpact >= 4 ? "medium" : "low";
      guidance.push({
        key: "missing-manager",
        label: "Fix reporting lines",
        description: `High impact on org clarity — ${data.count} ${data.count === 1 ? "person" : "people"} missing reporting lines.`,
        issueType: "MISSING_MANAGER",
        count: data.count,
        impactSum: data.impactSum,
      });
    }
    
    if (byType.has("MISSING_TEAM")) {
      const data = byType.get("MISSING_TEAM")!;
      const avgImpact = data.impactSum / data.count;
      const impactLevel = avgImpact >= 7 ? "high" : avgImpact >= 4 ? "medium" : "low";
      guidance.push({
        key: "missing-team",
        label: "Fix team assignments",
        description: `Improves team ownership — ${data.count} ${data.count === 1 ? "person" : "people"} missing team assignments.`,
        issueType: "MISSING_TEAM",
        count: data.count,
        impactSum: data.impactSum,
      });
    }
    
    if (byType.has("MISSING_ROLE")) {
      const data = byType.get("MISSING_ROLE")!;
      const avgImpact = data.impactSum / data.count;
      const impactLevel = avgImpact >= 7 ? "high" : avgImpact >= 4 ? "medium" : "low";
      guidance.push({
        key: "missing-role",
        label: "Fix role assignments",
        description: `Improves role clarity — ${data.count} ${data.count === 1 ? "person" : "people"} missing role definitions.`,
        issueType: "MISSING_ROLE",
        count: data.count,
        impactSum: data.impactSum,
      });
    }

    // Sort by impactSum desc (highest impact first)
    return guidance.sort((a, b) => (b.impactSum || 0) - (a.impactSum || 0));
  }, [people, signals]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/org/guidance", { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setItems(data.guidance || []);
    setLoading(false);
  }

  useEffect(() => {
    if (impactBasedGuidance) {
      setItems(impactBasedGuidance);
      setLoading(false);
    } else {
      load();
    }
  }, [impactBasedGuidance]);

  if (loading) {
    return (
      <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-black/60 dark:text-white/60">Loading guidance…</div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-black/90 dark:text-white/90">Top actions to improve org completeness</div>
        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
          Prioritized by impact on your org score.
        </div>
      </div>

      <div className="space-y-3">
        {items.map((i, idx) => (
          <div
            key={i.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-black/90 dark:text-white/90">
                {idx + 1}. {i.label}
              </div>
              <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">{i.description}</div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex flex-col items-end gap-0.5">
                <div className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                  {i.count}
                </div>
                {i.impactSum !== undefined && i.impactSum > 0 ? (
                  <div className="text-[10px] text-black/40 dark:text-white/40">
                    Impact {i.impactSum}
                  </div>
                ) : null}
              </div>
              <a
                href={`/org/people?tab=issues&issues=${i.issueType}`}
                className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                Fix
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

