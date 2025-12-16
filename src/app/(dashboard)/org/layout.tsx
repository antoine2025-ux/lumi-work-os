import type { ReactNode } from "react";
import { Suspense } from "react";
import { OrgPermissionsProvider } from "@/components/org/OrgPermissionsContext";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgLayoutClient } from "@/components/org/OrgLayoutClient";

type OrgLayoutProps = {
  children: ReactNode;
};

export default async function OrgLayout({ children }: OrgLayoutProps) {
  // Fetch server-side permission context
  const context = await getOrgPermissionContext();

  // Map to the lightweight client shape
  const clientPermissions = context
    ? { role: context.role }
    : null;

  return (
    <OrgPermissionsProvider value={clientPermissions}>
      <OrgLayoutClient beta={false} showHeader={false}>
        {children}
      </OrgLayoutClient>
    </OrgPermissionsProvider>
  );
}

