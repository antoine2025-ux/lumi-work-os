/**
 * Org Settings Client Component
 * 
 * PERFORMANCE: Uses startTransition for tab switches to keep UI responsive.
 */

"use client";

import { useState } from "react";
import { OrgTabNav, type OrgTab } from "@/components/org/OrgTabNav";
import { MembersSection } from "@/components/org/settings/MembersSection";
import { InvitesSection } from "@/components/org/settings/InvitesSection";
import { GeneralSettingsSection } from "@/components/org/settings/GeneralSettingsSection";
import { DangerZoneSection } from "@/components/org/settings/DangerZoneSection";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import type { OrgRole } from "@/lib/org/capabilities";

const SETTINGS_TABS: OrgTab[] = [
  { id: "members", label: "Members" },
  { id: "invites", label: "Invites" },
  { id: "general", label: "General" },
  { id: "danger", label: "Danger zone" },
];

type OrgSettingsClientProps = {
  orgId: string;
  role: OrgRole;
  canSeeMembers: boolean;
  canManageInvites: boolean;
  canSeeDanger: boolean;
  currentUserId?: string;
  initialMembers?: any[];
  initialInvitations?: any[];
  initialCustomRoles?: any[];
};

export function OrgSettingsClient({
  orgId,
  role,
  canSeeMembers,
  canManageInvites,
  canSeeDanger,
  currentUserId = "",
  initialMembers = [],
  initialInvitations = [],
  initialCustomRoles = [],
}: OrgSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<string>("members");

  const visibleTabs = SETTINGS_TABS.filter((tab) => {
    if (tab.id === "members") return canSeeMembers;
    if (tab.id === "invites") return canManageInvites;
    if (tab.id === "danger") return canSeeDanger;
    // General tab is always visible
    return true;
  });

  return (
    <>
      <OrgPageHeader
        breadcrumb={[
          { label: "ORG", href: "/org" },
          { label: "ORG SETTINGS" }
        ]}
        title="Org settings"
        description="Manage this organization's members, invites, and configuration."
        actions={
          <OrgTabNav
            tabs={visibleTabs}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        }
      />

      <div className="px-10 pb-10">
        {activeTab === "members" && (
          <MembersSection
            orgId={orgId}
            currentUserId={currentUserId}
            initialMembers={initialMembers}
            initialCustomRoles={initialCustomRoles}
          />
        )}

        {activeTab === "invites" && canManageInvites && (
          <InvitesSection orgId={orgId} initialInvitations={initialInvitations} />
        )}

        {activeTab === "general" && (
          <GeneralSettingsSection 
            orgId={orgId} 
            permissions={{ workspaceId: orgId, role, userId: currentUserId }} 
          />
        )}

        {activeTab === "danger" && canSeeDanger && (
          <DangerZoneSection orgId={orgId} />
        )}
      </div>
    </>
  );
}

