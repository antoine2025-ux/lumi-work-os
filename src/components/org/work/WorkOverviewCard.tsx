/**
 * WorkOverviewCard -- Overview page summary of open work requests
 *
 * Shows:
 *   - Count of open work requests
 *   - Recommendation breakdown (PROCEED / DELAY / REQUEST_SUPPORT / REASSIGN)
 *   - CTA to /org/work
 *
 * Fetches feasibility for at most 10 open requests to bound API cost.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";

const MAX_FEASIBILITY_REQUESTS = 10;

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  PROCEED: { label: "Can proceed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  DELAY: { label: "Blocked by capacity", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  REQUEST_SUPPORT: { label: "Not staffable", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  REASSIGN: { label: "Needs reassignment", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

type WorkRequest = {
  id: string;
  title: string;
  priority: string;
  status: string;
};

type RecommendationCounts = Record<string, number>;

export function WorkOverviewCard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [counts, setCounts] = useState<RecommendationCounts>({});
  const [totalOpen, setTotalOpen] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch open work requests
      const res = await fetch("/api/org/work/requests?status=OPEN");
      if (!res.ok) {
        setRequests([]);
        setTotalOpen(0);
        return;
      }
      const data = await res.json();
      const openRequests: WorkRequest[] = data.requests ?? [];
      setRequests(openRequests);
      setTotalOpen(openRequests.length);

      if (openRequests.length === 0) return;

      // Fetch feasibility for top N (by priority, already sorted by API)
      const toEvaluate = openRequests.slice(0, MAX_FEASIBILITY_REQUESTS);
      const recCounts: RecommendationCounts = {};

      await Promise.all(
        toEvaluate.map(async (req) => {
          try {
            const fRes = await fetch(
              `/api/org/work/requests/${req.id}/feasibility`
            );
            if (!fRes.ok) return;
            const fData = await fRes.json();
            const action: string = fData.recommendation?.action ?? "UNKNOWN";
            recCounts[action] = (recCounts[action] ?? 0) + 1;
          } catch {
            // Skip failures silently
          }
        })
      );

      setCounts(recCounts);
    } catch {
      setRequests([]);
      setTotalOpen(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading work requests...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (totalOpen === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">No work requests yet</p>
              <p className="text-xs text-muted-foreground">
                Submit a work request to evaluate staffing feasibility.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/org/work">Create one</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build recommendation summary
  const evaluated = Object.values(counts).reduce((a, b) => a + b, 0);
  const unevaluated = totalOpen - evaluated;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {totalOpen} open request{totalOpen !== 1 ? "s" : ""}
              </p>
              {evaluated < totalOpen && (
                <p className="text-xs text-muted-foreground">
                  {evaluated} evaluated
                </p>
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/org/work">View all</Link>
          </Button>
        </div>

        {/* Recommendation breakdown */}
        {evaluated > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(RECOMMENDATION_LABELS).map(([key, { label, color }]) => {
              const count = counts[key] ?? 0;
              if (count === 0) return null;
              const Icon =
                key === "PROCEED" ? CheckCircle2
                : key === "DELAY" ? Clock
                : key === "REQUEST_SUPPORT" ? AlertTriangle
                : Users;
              return (
                <Badge key={key} variant="secondary" className={`text-xs ${color}`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {count} {label.toLowerCase()}
                </Badge>
              );
            })}
            {unevaluated > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{unevaluated} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
