"use client";

import React, { useEffect, useState } from "react";

type FixEvent = {
  id: string;
  personId?: string;
  personName?: string;
  fixType: string;
  impactScore: number;
  createdAt: string;
};

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  return d.toLocaleDateString();
}

function formatFixEvent(event: FixEvent): string {
  const personName = event.personName || "Unknown person";
  
  switch (event.fixType) {
    case "ASSIGN_MANAGER":
      return `Assigned manager to ${personName}`;
    case "ASSIGN_TEAM":
      return `Added team to ${personName}`;
    case "ASSIGN_ROLE":
      return `Assigned role to ${personName}`;
    default:
      return `Fixed issue for ${personName}`;
  }
}

export function RecentChanges({
  orgId,
  personId,
  limit = 8,
}: {
  orgId?: string;
  personId?: string;
  limit?: number;
}) {
  const [events, setEvents] = useState<FixEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (orgId) params.set("orgId", orgId);
        if (personId) params.set("personId", personId);
        params.set("limit", String(limit));

        const res = await fetch(`/api/org/fix-events?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        
        if (data?.ok && Array.isArray(data.events)) {
          setEvents(data.events);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.warn("Failed to load fix events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId, personId, limit]);

  if (loading) {
    return <div className="text-xs text-black/50 dark:text-white/50">Loading changes…</div>;
  }

  if (events.length === 0) {
    return <div className="text-xs text-black/50 dark:text-white/50">No changes yet</div>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-black/90 dark:text-white/90">
              {formatFixEvent(event)}
            </div>
            <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
              {formatRelativeTime(event.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

