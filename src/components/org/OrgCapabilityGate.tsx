"use client";

import * as React from "react";
import { OrgCapability } from "@/lib/org/capabilities";
import { canClient, OrgClientPermissions } from "@/lib/org/permissions.client";

type OrgCapabilityGateProps = {
  capability: OrgCapability;
  permissions: OrgClientPermissions | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function OrgCapabilityGate(props: OrgCapabilityGateProps) {
  const { capability, permissions, children, fallback = null } = props;

  // No context yet → say "no" instead of flashing privileged UI
  if (!permissions) {
    return <>{fallback ?? null}</>;
  }

  if (!canClient(permissions, capability)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

