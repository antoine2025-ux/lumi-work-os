"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgFeedbackDialog } from "@/components/org/feedback/OrgFeedbackDialog";

type OrgSidebarItem = {
  id: string;
  label: string;
  href: string;
  section: "main" | "org" | "admin" | "dev";
};

// Base sidebar items (always visible to org members)
const BASE_SIDEBAR_ITEMS: OrgSidebarItem[] = [
  // MAIN
  { id: "overview", label: "Overview", href: "/org", section: "main" },

  // ORG
  { id: "org-chart", label: "Org chart", href: "/org/chart", section: "org" },
  { id: "people", label: "People", href: "/org/people", section: "org" },
  { id: "structure", label: "Structure", href: "/org/structure", section: "org" },

  // ADMIN (conditionally shown)
  { id: "activity", label: "Activity & exports", href: "/org/activity", section: "admin" },
  { id: "insights", label: "Insights", href: "/org/insights", section: "admin" },
  { id: "settings", label: "Org settings", href: "/org/settings", section: "admin" },

  // DEV (optional internal tools)
  // { id: "loopbrain-dev", label: "Loopbrain Dev", href: "/org/dev/loopbrain", section: "dev" },
];

const SECTION_LABELS: Record<OrgSidebarItem["section"], string> = {
  main: "MAIN",
  org: "ORG",
  admin: "ADMIN",
  dev: "DEV",
};

function isItemActive(item: OrgSidebarItem, pathname: string | null): boolean {
  if (!pathname) return false;

  const path = pathname.replace(/\/+$/, "") || "/";

  // Overview is active on `/org` and `/org/` only
  if (item.href === "/org") {
    return path === "/org";
  }

  return path === item.href || path.startsWith(item.href + "/");
}

type OrgSidebarProps = {
  beta?: boolean;
};

export function OrgSidebar({ beta = false }: OrgSidebarProps) {
  const pathname = usePathname();
  const perms = useOrgPermissions();
  const role = perms?.role;

  // Filter sidebar items based on permissions
  const visibleItems = BASE_SIDEBAR_ITEMS.filter((item) => {
    // Activity tab requires org:activity:view (Members have this, but we gate it anyway for clarity)
    if (item.id === "activity") {
      return role && hasOrgCapability(role, "org:activity:view");
    }
    // Insights tab requires org:insights:view (Owner/Admin only)
    if (item.id === "insights") {
      return role && hasOrgCapability(role, "org:insights:view");
    }
    // All other items are visible to all org members
    return true;
  });

  const grouped = visibleItems.reduce(
    (acc, item) => {
      acc[item.section].push(item);
      return acc;
    },
    {
      main: [] as OrgSidebarItem[],
      org: [] as OrgSidebarItem[],
      admin: [] as OrgSidebarItem[],
      dev: [] as OrgSidebarItem[],
    }
  );

  return (
    <aside className="flex w-60 flex-col border-r border-[#111827] bg-[#020617] px-3 py-4 text-[13px] text-slate-300">
      {/* Sidebar header with optional Beta badge */}
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Org Center
        </div>
        {beta && (
          <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-200">
            Beta
          </span>
        )}
      </div>
      {/* Feedback button */}
      <div className="mb-6 px-2">
        <OrgFeedbackDialog />
      </div>
      <nav className="space-y-6">
        {(["main", "org", "admin", "dev"] as const).map((sectionKey) => {
          const items = grouped[sectionKey];

          if (!items.length) return null;

          return (
            <div key={sectionKey} className="space-y-1.5">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {SECTION_LABELS[sectionKey]}
              </div>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isItemActive(item, pathname);

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
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
