"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";

type OrgCtx = {
  activeOrgId: string | null;
  activeOrgName: string | null;
};

const Ctx = createContext<OrgCtx>({ activeOrgId: null, activeOrgName: null });

export function OrgContextProvider({
  children,
  initialOrgId,
  initialOrgName,
}: {
  children: React.ReactNode;
  initialOrgId: string | null;
  initialOrgName: string | null;
}) {
  const { data: session } = useSession();
  const sessionOrgId = (session as any)?.activeOrgId || null;

  const activeOrgId = sessionOrgId || initialOrgId;
  const activeOrgName = initialOrgName;

  const value = useMemo(() => ({ activeOrgId, activeOrgName }), [activeOrgId, activeOrgName]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrgContext() {
  return useContext(Ctx);
}
