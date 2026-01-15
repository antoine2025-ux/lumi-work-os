import type { ReactNode } from "react";
import { Suspense } from "react";
import { OrgPermissionsProvider } from "@/components/org/OrgPermissionsContext";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgLayoutClient } from "@/components/org/OrgLayoutClient";
import OrgShell from "./org-shell";
import { CurrentOrgProvider } from "./org-context";
import { getCurrentOrgId } from "@/lib/org/current-org";

type OrgLayoutProps = {
  children: ReactNode;
};

export default async function OrgLayout({ children }: OrgLayoutProps) {
  // Fetch server-side permission context
  // Wrap in try-catch to prevent layout errors from causing redirects
  let clientPermissions = null;
  try {
    const context = await getOrgPermissionContext();
    // Map to the lightweight client shape
    clientPermissions = context
      ? { role: context.role }
      : null;
  } catch (error) {
    console.error("[OrgLayout] Error getting permission context:", error);
    // Continue with null permissions - don't fail the entire layout
  }

  // Fetch current org ID for context
  const orgId = await getCurrentOrgId();

  return (
    <OrgPermissionsProvider value={clientPermissions}>
      <OrgLayoutClient beta={false} showHeader={false}>
        <CurrentOrgProvider initialOrgId={orgId}>
          <OrgShell>{children}</OrgShell>
        </CurrentOrgProvider>
      </OrgLayoutClient>
    </OrgPermissionsProvider>
  );
}

