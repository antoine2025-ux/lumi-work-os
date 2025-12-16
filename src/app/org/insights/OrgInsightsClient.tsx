"use client";

import { useEffect, useState } from "react";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";
import { OrgInsightsView } from "@/components/org/insights/OrgInsightsView";
import {
  OrgInsightsSummaryCardsSkeleton,
  OrgInsightsChartsSkeleton,
} from "@/components/org/skeletons/OrgInsightsSkeleton";
import { logOrgClientError } from "@/lib/org/observability.client";

type OrgInsightsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: OrgInsightsSnapshot };

/**
 * Client component that fetches insights data asynchronously from the API.
 * 
 * This component:
 * - Fetches /api/org/insights/overview on mount
 * - Shows skeletons while loading (matching final layout to prevent jumps)
 * - Renders the insights UI when data arrives
 * - Shows a friendly error state if the API fails
 * 
 * PERFORMANCE: The page shell renders instantly, and this component handles
 * the async data loading without blocking the initial render.
 */
export default function OrgInsightsClient() {
  const [state, setState] = useState<OrgInsightsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/org/insights/overview");

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          
          // Handle specific error cases
          if (res.status === 401) {
            throw new Error("You need to sign in to view insights.");
          } else if (res.status === 403) {
            throw new Error("You don't have permission to view insights.");
          } else if (res.status === 400) {
            throw new Error("No organization selected.");
          } else {
            throw new Error(errorData.error || "Failed to load insights");
          }
        }

        const json = await res.json();

        if (!json.ok || !json.insights) {
          throw new Error("Invalid response from server");
        }

        if (cancelled) return;

        setState({ status: "ready", data: json.insights });
      } catch (err: any) {
        if (cancelled) return;

        const message =
          err?.message || "Unable to load insights right now. Please try again later.";
        
        // Log client-side error for observability
        logOrgClientError("org_insights_render_error", {
          message: err?.message,
          status: err?.status,
        });
        
        setState({ status: "error", message });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state - show skeletons that match the final layout
  if (state.status === "loading") {
    return (
      <div className="space-y-6 animate-pulse">
        <OrgInsightsSummaryCardsSkeleton />
        <OrgInsightsChartsSkeleton />
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 px-6 py-4 text-sm text-red-100">
        <div className="font-semibold mb-1">Unable to load insights</div>
        <div className="text-red-200/80 text-xs">{state.message}</div>
      </div>
    );
  }

  // Ready state - render the insights view with smooth fade-in transition
  return (
    <div className="transition-opacity duration-300 ease-in-out">
      <OrgInsightsView insights={state.data} />
    </div>
  );
}

