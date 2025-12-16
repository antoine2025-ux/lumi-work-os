"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { OrgContextProvider } from "./org/_components/OrgContext";

export function DashboardProviders({
  children,
  initialOrgId,
  initialOrgName,
}: {
  children: React.ReactNode;
  initialOrgId: string | null;
  initialOrgName: string | null;
}) {
  return (
    <SessionProvider>
      <OrgContextProvider initialOrgId={initialOrgId} initialOrgName={initialOrgName}>
        {children}
      </OrgContextProvider>
    </SessionProvider>
  );
}

