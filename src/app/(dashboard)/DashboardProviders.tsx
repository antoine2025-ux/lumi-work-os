"use client";

import React, { createContext, useContext } from "react";

/**
 * Simple org context for dashboard components that need basic org info.
 * For full org permissions, use getOrgPermissionContext() server-side
 * or OrgPermissionsProvider client-side.
 */
type OrgContextValue = {
  orgId: string | null;
  orgName: string | null;
};

const OrgContext = createContext<OrgContextValue>({ orgId: null, orgName: null });

export function useOrgContext() {
  return useContext(OrgContext);
}

export function DashboardProviders({
  children,
  initialOrgId,
  initialOrgName,
}: {
  children: React.ReactNode;
  initialOrgId: string | null;
  initialOrgName: string | null;
}) {
  // FIX 2: Removed duplicate SessionProvider - root Providers component already has one
  // The duplicate caused DashboardLayoutClient to re-enter status: "loading" on every mount
  return (
    <OrgContext.Provider value={{ orgId: initialOrgId, orgName: initialOrgName }}>
      {children}
    </OrgContext.Provider>
  );
}

