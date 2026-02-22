/**
 * Server-side context provider for Org Center.
 * 
 * This provides the full OrgPermissionContext to all child pages,
 * avoiding duplicate calls to getOrgPermissionContext().
 * 
 * PERFORMANCE: The context is loaded once in the layout and cached
 * per-request using React.cache(), so pages don't need to call it again.
 */

import type { ReactNode } from "react";
import type { OrgPermissionContext } from "@/lib/org/permissions.server";

type OrgContextProviderProps = {
  context: OrgPermissionContext | null;
  children: ReactNode;
};

/**
 * Server component that provides org context to all child pages.
 * This avoids duplicate permission checks in each page component.
 */
export function OrgContextProvider({ children }: OrgContextProviderProps) {
  // In Next.js App Router, we can't use React Context for server components.
  // Instead, we'll pass context via a client component wrapper that provides it.
  // For now, we'll use a simpler approach: pass context via layout props.
  // This is handled in the layout by passing context to pages.
  return <>{children}</>;
}

