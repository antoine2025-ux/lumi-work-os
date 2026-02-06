"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
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
const ORG_NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/org" },
  { key: "people", label: "People", href: "/org/people" },
  { key: "structure", label: "Structure", href: "/org/structure" },
  { key: "chart", label: "Org Chart", href: "/org/chart" },
  { key: "ownership", label: "Ownership", href: "/org/ownership" },
  { key: "issues", label: "Issues", href: "/org/issues" },
  { key: "intelligence", label: "Intelligence", href: "/org/intelligence" },
  { key: "work", label: "Work", href: "/org/work" },
  { key: "settings", label: "Setup", href: "/org/setup" }, // Will be filtered by setupIncomplete
] as const;

// Base sidebar items (always visible to org members) - fallback if API fails
const BASE_SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", href: "/org", section: "main" },
  { id: "people", label: "People", href: "/org/people", section: "org" },
  { id: "structure", label: "Structure", href: "/org/structure", section: "org" },
  { id: "chart", label: "Org Chart", href: "/org/chart", section: "org" },
  { id: "ownership", label: "Ownership", href: "/org/ownership", section: "org" },
  { id: "issues", label: "Issues", href: "/org/issues", section: "org" },
  { id: "intelligence", label: "Intelligence", href: "/org/intelligence", section: "org" },
  { id: "work", label: "Work", href: "/org/work", section: "org" },
];

// Settings section items (admin-only)
const SETTINGS_NAV_ITEMS = [
  { key: "org-settings", label: "Org", href: "/org/settings" },
  { key: "workspace-settings", label: "Workspace", href: "/org/workspace-settings" },
] as const;

function isItemActive(item: { href: string }, pathname: string | null, allItems: Array<{ href: string }>): boolean {
  if (!pathname) return false;

  const path = pathname.replace(/\/+$/, "") || "/";

  // Overview is active on `/org` and `/org/` only
  if (item.href === "/org") {
    return path === "/org";
  }

  // Check for exact match first
  if (path === item.href) {
    return true;
  }

  // Check if path starts with this item's href
  if (!path.startsWith(item.href + "/")) {
    return false;
  }

  // If path starts with this href, check if there's a more specific matching item
  // (e.g., if we're on /org/health/ownership, don't highlight /org/health)
  const moreSpecificMatch = allItems.find(otherItem => {
    if (otherItem.href === item.href) return false; // Skip self
    // Check if other item's href is more specific (longer and starts with current item's href)
    return otherItem.href.startsWith(item.href + "/") && path.startsWith(otherItem.href);
  });

  // If there's a more specific match, this item is not active
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

  // Convert to sidebar format
  const visibleItems = navItems.map((item) => ({
    id: item.key,
    label: item.label,
    href: item.href,
  }));

  // Settings section visibility (admin-only, not just access control)
  // This is a navigation-level decision — non-admins don't see settings in sidebar at all
  const canAccessSettings = role && hasOrgCapability(role, "org:org:update");
  const settingsItems = SETTINGS_NAV_ITEMS.map((item) => ({
    id: item.key,
    label: item.label,
    href: item.href,
  }));

  // Combine all items for active state calculation
  const allItems = [...visibleItems, ...settingsItems];

  return (
    <aside className="flex w-60 flex-col border-r border-[#111827] bg-[#020617] px-3 py-4 text-[13px] text-slate-300">
      {/* ORG Section header - centered */}
      <div className="mb-4 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          ORG
        </div>
      </div>
      <nav className="space-y-1.5">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isItemActive(item, pathname, allItems);

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

      {/* SETTINGS Section - Admin/Owner only */}
      {canAccessSettings && (
        <>
          {/* Divider */}
          <div className="my-4 border-t border-[#1e293b]" />
          
          {/* SETTINGS header */}
          <div className="mb-3 flex items-center gap-1.5 px-2.5">
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Settings
            </span>
          </div>
          
          <nav className="space-y-1">
            <ul className="space-y-1">
              {settingsItems.map((item) => {
                const active = isItemActive(item, pathname, allItems);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      aria-label={`Go to ${item.label} Settings`}
                      className={cn(
                        "focus-ring group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] outline-none transition-all duration-150",
                        active
                          ? "border border-[#243B7D] bg-[#0B1220] text-slate-50 shadow-sm"
                          : "text-slate-400 hover:bg-[#050816] hover:text-slate-300 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.25)]"
                      )}
                    >
                      {/* Smaller dot for settings items */}
                      <span
                        className={cn(
                          "h-1 w-1 shrink-0 rounded-full transition-all duration-150",
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
        </>
      )}
    </aside>
  );
}
