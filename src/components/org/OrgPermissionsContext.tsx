"use client";

import * as React from "react";
import type { OrgClientPermissions } from "@/lib/org/permissions.client";

type OrgPermissionsContextValue = OrgClientPermissions | null;

const OrgPermissionsContext = React.createContext<OrgPermissionsContextValue>(null);

type OrgPermissionsProviderProps = {
  value: OrgPermissionsContextValue;
  children: React.ReactNode;
};

export function OrgPermissionsProvider({
  value,
  children,
}: OrgPermissionsProviderProps) {
  return (
    <OrgPermissionsContext.Provider value={value}>
      {children}
    </OrgPermissionsContext.Provider>
  );
}

export function useOrgPermissions(): OrgPermissionsContextValue {
  return React.useContext(OrgPermissionsContext);
}

