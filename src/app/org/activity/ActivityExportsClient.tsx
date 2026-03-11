/**
 * Activity & Exports Client Component
 * 
 * PERFORMANCE: Uses startTransition for tab switches to keep UI responsive
 * while content updates.
 */

"use client";

import { useState, startTransition } from "react";
import { OrgTabNav, type OrgTab } from "@/components/org/OrgTabNav";
import { ActivitySection } from "@/components/org/activity/ActivitySection";
import { ExportsSection } from "@/components/org/activity/ExportsSection";
import type { OrgAdminActivityItem } from "@/types/org";
import type { OrgRole } from "@/lib/org/capabilities";

const ACTIVITY_TABS: OrgTab[] = [
  { id: "activity", label: "Activity" },
  { id: "exports", label: "Exports" },
];

type ActivityExportsClientProps = {
  workspaceId: string;
  initialAdminActivity: OrgAdminActivityItem[];
  initialOrgActivity: {
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
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }[];
    nextCursor: string | null;
  } | null;
  role: OrgRole;
};

export function ActivityExportsClient({
  workspaceId,
  initialAdminActivity: _initialAdminActivity,
  initialOrgActivity,
  role: _role,
}: ActivityExportsClientProps) {
  const [activeTab, setActiveTab] = useState<string>("activity");

  // PERFORMANCE: Use startTransition to keep UI responsive during tab switches
  const handleTabChange = (tabId: string) => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  };

  return (
    <div className="px-10 pb-10">
      <div className="mb-6">
        <OrgTabNav
          tabs={ACTIVITY_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {activeTab === "activity" && (
        <ActivitySection
          workspaceId={workspaceId}
          initialOrgActivity={initialOrgActivity}
        />
      )}

      {activeTab === "exports" && (
        <ExportsSection workspaceId={workspaceId} />
      )}
    </div>
  );
}

