"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MY_PROFILE_ITEMS,
  MY_TEAM_ITEMS,
  ORG_SECTION_ITEMS,
  ADMIN_SECTION_ITEMS,
  filterNavItems,
  type NavItemRole,
} from "@/lib/org/nav-config";

function isItemActive(itemHref: string, pathname: string | null, allHrefs: string[]): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === itemHref) return true;
  if (!path.startsWith(itemHref + "/")) return false;
  const moreSpecific = allHrefs.some((h) => h !== itemHref && h.startsWith(itemHref + "/") && path.startsWith(h));
  return !moreSpecific;
}

type OrgSidebarProps = {
  beta?: boolean;
  workspaceSlug?: string;
  userRole: NavItemRole;
};

export function OrgSidebar({
  workspaceSlug = "",
  userRole,
}: OrgSidebarProps) {
  const pathname = usePathname();
  const base = workspaceSlug ? `/w/${workspaceSlug}/org` : "/org";

  const myProfileSection = filterNavItems(MY_PROFILE_ITEMS, userRole)
    .map(item => ({ ...item, href: `${base}${item.href}` }));

  const myTeamSection = filterNavItems(MY_TEAM_ITEMS, userRole)
    .map(item => ({ ...item, href: `${base}${item.href}` }));

  const orgSection = filterNavItems(ORG_SECTION_ITEMS, userRole)
    .map(item => ({ ...item, href: `${base}${item.href}` }));

  const adminSection = filterNavItems(ADMIN_SECTION_ITEMS, userRole)
    .map(item => ({ ...item, href: `${base}${item.href}` }));

  const allHrefs = [
    ...myProfileSection.map((i) => i.href),
    ...myTeamSection.map((i) => i.href),
    ...orgSection.map((i) => i.href),
    ...adminSection.map((i) => i.href),
  ];

  const renderLink = (
    href: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean
  ) => (
    <li key={href}>
      <Link
        href={href}
        prefetch={true}
        aria-label={`Go to ${label}`}
        className={cn(
          "focus-ring flex items-center gap-2 px-3 py-1.5 mx-2 text-sm rounded-md transition-colors outline-none",
          active
            ? "bg-accent/70 text-foreground font-medium"
            : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4 shrink-0",
            active ? "text-primary" : "text-foreground/50"
          )}
        />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );

  const sectionLabelClass = "text-xs font-medium text-muted-foreground/60 uppercase tracking-wider px-3 mb-1.5";

  return (
    <aside className="w-[240px] flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto">
      <nav className="py-3">
        <div className="mb-4">
          <h3 className={sectionLabelClass}>My Profile</h3>
          <ul className="space-y-0.5">
            {myProfileSection.map((item) => {
              const Icon = item.icon;
              return renderLink(
                item.href,
                item.label,
                Icon,
                isItemActive(item.href, pathname, allHrefs)
              );
            })}
          </ul>
        </div>

        <div className="mt-5 mb-4">
          <h3 className={sectionLabelClass}>My Team</h3>
          <ul className="space-y-0.5">
            {myTeamSection.map((item) => {
              const Icon = item.icon;
              return renderLink(
                item.href,
                item.label,
                Icon,
                isItemActive(item.href, pathname, allHrefs)
              );
            })}
          </ul>
        </div>

        <div className="mt-5 mb-4">
          <h3 className={sectionLabelClass}>Organization</h3>
          <ul className="space-y-0.5">
            {orgSection.map((item) => {
              const Icon = item.icon;
              return renderLink(
                item.href,
                item.label,
                Icon,
                isItemActive(item.href, pathname, allHrefs)
              );
            })}
          </ul>
        </div>

        {adminSection.length > 0 && (
          <div className="mt-5">
            <h3 className={cn(sectionLabelClass, "flex items-center gap-1.5")}>
              <Shield className="w-3 h-3 shrink-0" />
              Admin
            </h3>
            <ul className="space-y-0.5">
              {adminSection.map((item) => {
                const Icon = item.icon;
                return renderLink(
                  item.href,
                  item.label,
                  Icon,
                  isItemActive(item.href, pathname, allHrefs)
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
