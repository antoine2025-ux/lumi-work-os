/**
 * Workspace-Scoped Org Layout
 * 
 * This layout wraps all org pages under /w/[workspaceSlug]/org/
 * It reuses the new Org UI components from src/components/org/
 * 
 * IMPORTANT: This layout is nested inside the dashboard layout which already
 * provides a Header, so we set showHeader={false} on OrgLayoutClient.
 */

import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { OrgPermissionsProvider } from "@/components/org/OrgPermissionsContext";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgLayoutClient } from "@/components/org/OrgLayoutClient";
import {
  isOrgCenterEnabled,
  isOrgCenterBeta,
  isOrgCenterForceDisabled,
} from "@/lib/org/feature-flags";
import { OrgCenterDisabled } from "@/components/org/OrgCenterDisabled";
import { prisma } from "@/lib/db";
import { ensureOrgContextSynced } from "@/lib/loopbrain/ensureOrgContextSynced";
import type { NavItemRole } from "@/lib/org/nav-config";

type WorkspaceOrgLayoutProps = {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgLayout({ 
  children, 
  params 
}: WorkspaceOrgLayoutProps) {
  const { workspaceSlug } = await params;

  // Emergency force-disable check
  if (isOrgCenterForceDisabled()) {
    return <OrgCenterDisabled />;
  }

  // Feature flag check
  if (!isOrgCenterEnabled()) {
    return (
      <div className="px-10 pt-10">
        <div className="max-w-lg rounded-2xl border border-border bg-background px-6 py-6 text-[13px] text-foreground">
          <div className="mb-1 text-[14px] font-semibold text-foreground">
            Org Center is not available
          </div>
          <p className="text-[11px] text-muted-foreground">
            Org Center is currently turned off for this environment.
          </p>
        </div>
      </div>
    );
  }

  // Get permission context
  let context: Awaited<ReturnType<typeof getOrgPermissionContext>> = null;
  try {
    context = await getOrgPermissionContext();
  } catch (error: unknown) {
    console.error("[WorkspaceOrgLayout] Error getting permission context:", error);
    context = null;
  }

  // If no context, user is not authenticated or has no workspace
  if (!context) {
    return (
      <div className="px-10 pt-10">
        <div className="max-w-lg rounded-2xl border border-border bg-background px-6 py-6 text-[13px] text-foreground">
          <div className="mb-1 text-[14px] font-semibold text-foreground">
            No access to Org Center
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            You need to be a member of a workspace to access the Org Center.
          </p>
          <a
            href="/welcome"
            className="inline-block rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] text-foreground hover:bg-blue-500 transition-colors"
          >
            Create workspace
          </a>
        </div>
      </div>
    );
  }

  // Validate that the workspace slug matches the user's current workspace
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: context.workspaceId },
      select: { id: true, slug: true },
    });

    if (!workspace) {
      console.error("[WorkspaceOrgLayout] Workspace not found for orgId:", context.workspaceId);
      notFound();
    }

    // If slug doesn't match, redirect to the correct workspace
    if (workspace.slug !== workspaceSlug) {
      redirect(`/w/${workspace.slug}/org`);
    }
  } catch (error: unknown) {
    // Check if it's a redirect error (Next.js throws these)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error("[WorkspaceOrgLayout] Error validating workspace:", error);
    notFound();
  }

  const clientPermissions = { role: context.role };

  // Ensure org context is synced for Loopbrain (non-blocking)
  // This runs in the background and doesn't block rendering
  ensureOrgContextSynced(context.workspaceId).catch(err => {
    console.error('[WorkspaceOrgLayout] Failed to ensure org context synced:', err)
  })

  return (
    <OrgPermissionsProvider value={clientPermissions}>
      <OrgLayoutClient
        beta={isOrgCenterBeta()}
        showHeader={false}
        workspaceSlug={workspaceSlug}
        userRole={context.role as NavItemRole}
      >
        {children}
      </OrgLayoutClient>
    </OrgPermissionsProvider>
  );
}
