/**
 * WorkOverviewCard -- Overview page summary of open work requests
 *
 * Shows:
 *   - Count of open work requests
 *   - Recommendation breakdown (PROCEED / DELAY / REQUEST_SUPPORT / REASSIGN)
 *   - Unacknowledged recommendations count (W1.5)
 *   - Up to 3 unacknowledged items with deep links (W1.5)
 *   - CTA to /org/work
 *
 * Uses list API latestRecommendationAction / latestAcknowledgedAt fields
 * instead of per-request feasibility fetches.
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Bell,
} from "lucide-react";

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  PROCEED: { label: "Can proceed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  DELAY: { label: "Blocked by capacity", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  REQUEST_SUPPORT: { label: "Not staffable", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  REASSIGN: { label: "Needs reassignment", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const MAX_ATTENTION_ITEMS = 3;

type WorkRequestItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  isProvisional: boolean;
  latestRecommendationAction: string | null;
  latestAcknowledgedAt: string | null;
};

type RecommendationCounts = Record<string, number>;

export function WorkOverviewCard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WorkRequestItem[]>([]);
  const [totalOpen, setTotalOpen] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch open work requests (list API now includes recommendation state)
      const res = await fetch("/api/org/work/requests?status=OPEN");
      if (!res.ok) {
        setRequests([]);
        setTotalOpen(0);
        return;
      }
      const data = await res.json();
      const openRequests: WorkRequestItem[] = data.requests ?? [];
      setRequests(openRequests);
      setTotalOpen(openRequests.length);
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

  // Derive counts from list data (no per-request feasibility calls needed)
  const counts = useMemo<RecommendationCounts>(() => {
    const c: RecommendationCounts = {};
    for (const req of requests) {
      if (req.latestRecommendationAction) {
        c[req.latestRecommendationAction] = (c[req.latestRecommendationAction] ?? 0) + 1;
      }
    }
    return c;
  }, [requests]);

  // W1.5: Unacknowledged = has recommendation but no acknowledgedAt
  // O1: Exclude provisional work — they can't be acknowledged by design
  const unacknowledgedItems = useMemo(
    () =>
      requests.filter(
        (r) =>
          !r.isProvisional &&
          r.latestRecommendationAction !== null &&
          r.latestAcknowledgedAt === null
      ),
    [requests]
  );

  const evaluated = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

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

        {/* W1.5: Unacknowledged recommendations */}
        {unacknowledgedItems.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <Bell className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">
                  {unacknowledgedItems.length} unacknowledged recommendation
                  {unacknowledgedItems.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-6 text-xs">
                <Link href="/org/work">Review work</Link>
              </Button>
            </div>
            {/* Show up to 3 items needing attention */}
            <div className="space-y-1">
              {unacknowledgedItems.slice(0, MAX_ATTENTION_ITEMS).map((item) => (
                <Link
                  key={item.id}
                  href={`/org/work/${item.id}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                >
                  <span className="truncate flex-1">{item.title}</span>
                  {item.latestRecommendationAction && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {RECOMMENDATION_LABELS[item.latestRecommendationAction]?.label ??
                        item.latestRecommendationAction}
                    </Badge>
                  )}
                </Link>
              ))}
              {unacknowledgedItems.length > MAX_ATTENTION_ITEMS && (
                <p className="text-xs text-muted-foreground">
                  +{unacknowledgedItems.length - MAX_ATTENTION_ITEMS} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
