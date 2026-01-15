import { Metadata } from "next";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getWorkspaceForCurrentUser } from "@/server/data/workspace";
import {
  getOrgActivityForWorkspace,
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";
import { OrgActivityPanel } from "@/components/org/org-activity-panel";
import { ActivityExportButtons } from "@/components/org/activity-export-buttons";
import { AppErrorAlert } from "@/components/shared/app-error-alert";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

type OrgActivitySettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Workspace activity",
};

function asEventFilter(value: string | undefined): OrgActivityEventFilter {
  const allowed: OrgActivityEventFilter[] = ["all", "org", "membership", "ownership"];
  if (!value) return "all";
  return (allowed.includes(value as OrgActivityEventFilter)
    ? (value as OrgActivityEventFilter)
    : "all");
}

function asTimeframe(value: string | undefined): OrgActivityTimeframeFilter {
  const allowed: OrgActivityTimeframeFilter[] = ["7d", "30d", "90d", "all"];
  if (!value) return "30d"; // Slightly narrower default for the dedicated page
  return (allowed.includes(value as OrgActivityTimeframeFilter)
    ? (value as OrgActivityTimeframeFilter)
    : "30d");
}

export default async function OrgActivitySettingsPage({
  searchParams,
}: OrgActivitySettingsPageProps) {
  const workspaceId = await getCurrentWorkspaceId();
  const resolvedSearchParams = await searchParams;

  // Ensure the user can access this workspace (membership + basic auth).
  const workspace = await getWorkspaceForCurrentUser(workspaceId);

  const eventFilterParam =
    typeof resolvedSearchParams?.eventFilter === "string"
      ? resolvedSearchParams?.eventFilter
      : undefined;
  const timeframeParam =
    typeof resolvedSearchParams?.timeframe === "string"
      ? resolvedSearchParams?.timeframe
      : undefined;

  const initialEventFilter = asEventFilter(eventFilterParam);
  const initialTimeframe = asTimeframe(timeframeParam);

  // Load initial page of activity with the chosen filters.
  let initialActivity:
    | {
        items: {
          id: string;
          workspaceId: string;
          event: string;
          actorUserId: string | null;
          targetUserId: string | null;
          actorName: string | null;
          actorEmail: string | null;
          targetName: string | null;
          targetEmail: string | null;
          metadata: Record<string, any> | null;
          createdAt: string;
        }[];
        nextCursor: string | null;
      }
    | null = null;
  let loadError: string | null = null;

  try {
    const activity = await getOrgActivityForWorkspace({
      workspaceId,
      limit: 30,
      eventFilter: initialEventFilter,
      timeframe: initialTimeframe,
    });

    initialActivity = {
      items: activity.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      nextCursor: activity.nextCursor,
    };
  } catch (err) {
    // If the user is not an admin (or any other error), we surface a simple message below.
    initialActivity = null;
    loadError =
      "You do not have permission to view activity for this workspace, or an error occurred.";
  }

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">
          Workspace Activity {workspace.name ? `– ${workspace.name}` : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          View a chronological, filterable log of important changes to this workspace, and export activity for compliance or analysis.
        </p>
      </header>

      {initialActivity && (
        <ActivityExportButtons
          workspaceId={workspaceId}
          eventFilter={initialEventFilter}
          timeframe={initialTimeframe}
        />
      )}

      {loadError && (
        <AppErrorAlert
          title="Unable to load workspace activity"
          message={loadError}
        />
      )}

      {initialActivity && (
        <OrgActivityPanel
          workspaceId={workspaceId}
          initialItems={initialActivity.items}
          initialNextCursor={initialActivity.nextCursor}
          initialEventFilter={initialEventFilter}
          initialTimeframe={initialTimeframe}
        />
      )}

      {!initialActivity && !loadError && (
        <p className="text-sm text-muted-foreground">
          No activity available for this workspace yet.
        </p>
      )}
    </div>
  );
}

