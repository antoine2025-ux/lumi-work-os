"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { hasOrgCapability } from "@/lib/org/capabilities";

/**
 * MVP Navigation (max 4 tabs)
 * 
 * Final MVP tabs:
 * - Overview (with health signals as derived data)
 * - People (core MVP surface)
 * - Structure (departments, teams, roles - mapped to /org/structure)
 * - Ownership (who owns what)
 * 
 * Health is folded into Overview as derived signals.
 * Settings only shows when setup is incomplete.
 */

// Base paths (without workspace prefix)
const ORG_NAV_ITEMS = [
  { key: "overview", label: "Overview", basePath: "" },
  { key: "people", label: "People", basePath: "/people" },
  { key: "structure", label: "Structure", basePath: "/structure" },
  { key: "chart", label: "Org Chart", basePath: "/chart" },
  { key: "ownership", label: "Ownership", basePath: "/ownership" },
  { key: "issues", label: "Issues", basePath: "/issues" },
  { key: "intelligence", label: "Intelligence", basePath: "/intelligence" },
  { key: "settings", label: "Setup", basePath: "/setup" }, // Will be filtered by setupIncomplete
] as const;

/**
 * Extract workspace slug from pathname if on a workspace-scoped route
 * e.g., /w/my-workspace/org/people -> "my-workspace"
 */
function extractWorkspaceSlug(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/w\/([^/]+)\/org/);
  return match ? match[1] : null;
}

/**
 * Build the correct href based on whether we're in workspace-scoped context
 */
function buildOrgHref(basePath: string, workspaceSlug: string | null): string {
  if (workspaceSlug) {
    return `/w/${workspaceSlug}/org${basePath}`;
  }
  return `/org${basePath}`;
}

/**
 * Check if an item's href matches the current pathname
 */
function isItemActive(
  itemBasePath: string,
  pathname: string | null,
  allBasePaths: string[],
  workspaceSlug: string | null
): boolean {
  if (!pathname) return false;

  const path = pathname.replace(/\/+$/, "") || "/";
  const itemHref = buildOrgHref(itemBasePath, workspaceSlug);

  // Overview is active on base org path only
  if (itemBasePath === "") {
    const baseOrgPath = workspaceSlug ? `/w/${workspaceSlug}/org` : "/org";
    return path === baseOrgPath;
  }

  // Check for exact match first
  if (path === itemHref) {
    return true;
  }

  // Check if path starts with this item's href
  if (!path.startsWith(itemHref + "/")) {
    return false;
  }

  // If path starts with this href, check if there's a more specific matching item
  const moreSpecificMatch = allBasePaths.find(otherBasePath => {
    if (otherBasePath === itemBasePath) return false;
    const otherHref = buildOrgHref(otherBasePath, workspaceSlug);
    return otherHref.startsWith(itemHref + "/") && path.startsWith(otherHref);
  });

  return !moreSpecificMatch;
}

type OrgSidebarProps = {
  beta?: boolean;
};

export function OrgSidebar({ beta = false }: OrgSidebarProps) {
  const pathname = usePathname();
  const perms = useOrgPermissions();
  const role = perms?.role;

  const [setupIncomplete, setSetupIncomplete] = useState(false);

  // Extract workspace slug from current pathname (if on workspace-scoped route)
  const workspaceSlug = useMemo(() => extractWorkspaceSlug(pathname), [pathname]);

  // Fetch setup status on mount
  useEffect(() => {
    fetch("/api/org/setup-status")
      .then((r) => {
        // Check if response is JSON before parsing
        const contentType = r.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        return r.json();
      })
      .then((data) => {
        if (data?.ok && data?.status) {
          setSetupIncomplete(data.status.setupIncomplete ?? false);
        }
      })
      .catch(() => {
        // Ignore errors - use default items
      });
  }, []);

  // Filter navigation items based on setup status
  const navItems = ORG_NAV_ITEMS.filter((item) => {
    // Setup tab only shows when incomplete
    if (item.key === "settings") {
      return setupIncomplete;
    }
    // All other items always show
    return true;
  });

  // Get all base paths for active state checking
  const allBasePaths = navItems.map(item => item.basePath);

  // Convert to sidebar format with workspace-aware hrefs
  const visibleItems = navItems.map((item) => ({
    id: item.key,
    label: item.label,
    basePath: item.basePath,
    href: buildOrgHref(item.basePath, workspaceSlug),
  }));

  return (
    <aside className="flex w-60 flex-col border-r border-[#111827] bg-[#020617] px-3 py-4 text-[13px] text-slate-300">
      {/* Section header - centered */}
      <div className="mb-4 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          ORG
        </div>
      </div>
      <nav className="space-y-1.5">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isItemActive(item.basePath, pathname, allBasePaths, workspaceSlug);

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  prefetch={true}
                  aria-label={`Go to ${item.label}`}
                  className={cn(
                    "focus-ring group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] outline-none transition-all duration-150",
                    active
                      ? "border border-[#243B7D] bg-[#0B1220] text-slate-50 shadow-sm"
                      : "text-slate-300 hover:bg-[#050816] hover:text-slate-50 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)]"
                  )}
                >
                  {/* Blue dot for active item */}
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-150",
                      active 
                        ? "bg-[#5CA9FF] scale-100" 
                        : "bg-transparent group-hover:bg-[#334155] scale-75"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
