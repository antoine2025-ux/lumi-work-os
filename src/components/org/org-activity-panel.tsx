"use client";

import { useState, memo, useCallback, startTransition, useEffect } from "react";
import { parseApiError } from "@/lib/api-error";
import { logOrgClientError } from "@/lib/org/observability.client";

type OrgActivityItem = {
  id: string;
  workspaceId: string;
  event: string;
  actorUserId: string | null;
  targetUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type OrgActivityEventFilter = "all" | "org" | "membership" | "ownership";
type OrgActivityTimeframeFilter = "7d" | "30d" | "90d" | "all";

export type OrgActivityPanelProps = {
  workspaceId: string;
  initialItems: OrgActivityItem[];
  initialNextCursor: string | null;
  initialEventFilter?: OrgActivityEventFilter;
  initialTimeframe?: OrgActivityTimeframeFilter;
};

function formatActor(actorName: string | null, actorEmail: string | null) {
  if (actorName) return actorName;
  if (actorEmail) return actorEmail;
  return "Someone";
}

function formatTarget(targetName: string | null, targetEmail: string | null) {
  if (targetName) return targetName;
  if (targetEmail) return targetEmail;
  return "a member";
}

function formatEventDescription(item: OrgActivityItem): string {
  const actor = formatActor(item.actorName, item.actorEmail);
  const target = formatTarget(item.targetName, item.targetEmail);

  switch (item.event) {
    case "ORG_CREATED":
      return `${actor} created the workspace.`;

    case "ORG_DELETED":
      return `${actor} deleted the workspace.`;

    case "MEMBER_ADDED":
      return `${actor} added ${target} to the workspace.`;

    case "MEMBER_REMOVED":
      return `${actor} removed ${target} from the workspace.`;

    case "MEMBER_ROLE_CHANGED": {
      const fromRole = item.metadata?.fromRole as string | undefined;
      const toRole = item.metadata?.toRole as string | undefined;
      if (fromRole && toRole) {
        return `${actor} changed ${target}'s role from ${fromRole.toLowerCase()} to ${toRole.toLowerCase()}.`;
      }
      return `${actor} changed ${target}'s role.`;
    }

    case "ORG_OWNERSHIP_TRANSFERRED":
      return `${actor} transferred workspace ownership to ${target}.`;

    default:
      return `${actor} performed an action.`;
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

/**
 * Memoized activity list item component.
 * Only re-renders when the item data changes.
 */
const ActivityErrorDisplay = memo(function ActivityErrorDisplay({ 
  error, 
  workspaceId 
}: { 
  error: string; 
  workspaceId: string;
}) {
  useEffect(() => {
    logOrgClientError("org_activity_error_displayed", {
      message: error,
      workspaceId,
    });
  }, [error, workspaceId]);

  return (
    <p className="text-xs text-destructive">
      {error}
    </p>
  );
});

const ActivityListItem = memo(function ActivityListItem({ item }: { item: OrgActivityItem }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex-1">
        <p>{formatEventDescription(item)}</p>
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Metadata:{" "}
            <code className="text-[11px]">
              {JSON.stringify(item.metadata)}
            </code>
          </p>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
        {formatTimestamp(item.createdAt)}
      </span>
    </li>
  );
});

export function OrgActivityPanel({
  workspaceId,
  initialItems,
  initialNextCursor,
  initialEventFilter = "all",
  initialTimeframe = "all",
}: OrgActivityPanelProps) {
  const [items, setItems] = useState<OrgActivityItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] =
    useState<OrgActivityEventFilter>(initialEventFilter);
  const [timeframe, setTimeframe] =
    useState<OrgActivityTimeframeFilter>(initialTimeframe);
  const [reloading, setReloading] = useState(false);

  function extractPayload(body: Record<string, unknown>): { items: OrgActivityItem[]; nextCursor: string | null } {
    const data = body?.data as Record<string, unknown> | undefined;
    if (body && body.ok && data) {
      return {
        items: (data.items ?? []) as OrgActivityItem[],
        nextCursor: (data.nextCursor ?? null) as string | null,
      };
    }
    // Backwards compatibility (non-envelope)
    return {
      items: (body?.items ?? []) as OrgActivityItem[],
      nextCursor: (body?.nextCursor ?? null) as string | null,
    };
  }

  const reloadWithFilters = useCallback(async (nextEventFilter: OrgActivityEventFilter, nextTimeframe: OrgActivityTimeframeFilter) => {
    setReloading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId,
        eventFilter: nextEventFilter,
        timeframe: nextTimeframe,
      });

      const res = await fetch(`/api/org/activity?${params.toString()}`, {
        method: "GET",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || body?.ok === false) {
        const parsed = parseApiError(body);
        const msg =
          parsed?.message ?? "Failed to load activity.";
        setError(msg);
        setItems([]);
        setNextCursor(null);
        return;
      }

      const payload = extractPayload(body);
      // Use startTransition for state updates to keep UI responsive
      startTransition(() => {
        setItems(payload.items);
        setNextCursor(payload.nextCursor);
      });
      setEventFilter(nextEventFilter);
      setTimeframe(nextTimeframe);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading activity.");
    } finally {
      setReloading(false);
    }
  }, [workspaceId]);

  const handleChangeEventFilter = useCallback((value: OrgActivityEventFilter) => {
    if (value === eventFilter) return;
    reloadWithFilters(value, timeframe);
  }, [eventFilter, timeframe, reloadWithFilters]);

  const handleChangeTimeframe = useCallback((value: OrgActivityTimeframeFilter) => {
    if (value === timeframe) return;
    reloadWithFilters(eventFilter, value);
  }, [eventFilter, timeframe, reloadWithFilters]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId,
        cursor: nextCursor,
        eventFilter,
        timeframe,
      });

      const res = await fetch(`/api/org/activity?${params.toString()}`, {
        method: "GET",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || body?.ok === false) {
        const parsed = parseApiError(body);
        const msg =
          parsed?.message ?? "Failed to load more activity.";
        setError(msg);
        return;
      }

      const payload = extractPayload(body);
      setItems((prev) => [...prev, ...(payload.items ?? [])]);
      setNextCursor(payload.nextCursor);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading more activity.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!items.length && !nextCursor) {
    return null;
  }

  return (
    <section className="mt-8 border rounded-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span>Organization activity</span>
        <span className="text-xs text-muted-foreground">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Type:</span>
              <select
                value={eventFilter}
                disabled={reloading}
                onChange={(e) =>
                  handleChangeEventFilter(e.target.value as OrgActivityEventFilter)
                }
                className="border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">All</option>
                <option value="membership">Membership</option>
                <option value="ownership">Ownership</option>
                <option value="org">Workspace lifecycle</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Timeframe:</span>
              <select
                value={timeframe}
                disabled={reloading}
                onChange={(e) =>
                  handleChangeTimeframe(e.target.value as OrgActivityTimeframeFilter)
                }
                className="border rounded-md px-2 py-1 bg-background"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {reloading && (
              <span className="text-[11px] text-muted-foreground">
                Updating…
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity for the selected filters. Try a different type or timeframe.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.map((item) => (
                <ActivityListItem key={item.id} item={item} />
              ))}
            </ul>
          )}

          {error && (
            <ActivityErrorDisplay error={error} workspaceId={workspaceId} />
          )}

          {nextCursor && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore || reloading}
                className="text-xs px-2 py-1 border rounded-md hover:bg-muted disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

