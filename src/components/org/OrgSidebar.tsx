"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  Building2,
  Network,
  Briefcase,
  Shield,
  Activity,
  Gauge,
  Scale,
  UserCog,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  isAdmin?: boolean;
  isTeamLead?: boolean;
};

export function OrgSidebar({
  beta = false,
  workspaceSlug = "",
  isAdmin = false,
  isTeamLead = false,
}: OrgSidebarProps) {
  const pathname = usePathname();
  const base = workspaceSlug ? `/w/${workspaceSlug}/org` : "/org";

  const mySection = [
    { href: `${base}/profile`, label: "My Profile", icon: User },
    ...(isTeamLead ? [{ href: `${base}/my-team`, label: "My Team", icon: Users }] : []),
    { href: `${base}/my-department`, label: "My Department", icon: Building2 },
  ];

  const orgSection = [
    { href: `${base}/directory`, label: "Directory", icon: Users },
    { href: `${base}/structure`, label: "Teams & Departments", icon: Network },
    { href: `${base}/chart`, label: "Org Chart", icon: Building2 },
    { href: `${base}/positions`, label: "Positions & Roles", icon: Briefcase },
  ];

  const adminSection = isAdmin
    ? [
        { href: `${base}/admin`, label: "Health & Issues", icon: Activity },
        { href: `${base}/admin/capacity`, label: "Capacity Planning", icon: Gauge },
        { href: `${base}/admin/decisions`, label: "Decision Authority", icon: Scale },
        { href: `${base}/admin/responsibility`, label: "Responsibility Profiles", icon: UserCog },
        { href: `${base}/admin/settings`, label: "Settings", icon: Settings },
      ]
    : [];

  const allHrefs = [
    ...mySection.map((i) => i.href),
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
          "focus-ring group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] outline-none transition-all duration-150",
          active
            ? "border border-[#243B7D] bg-[#0B1220] text-slate-50 shadow-sm"
            : "text-slate-300 hover:bg-[#050816] hover:text-slate-50 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)]"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-150",
            active ? "bg-[#5CA9FF] scale-100" : "bg-transparent group-hover:bg-[#334155] scale-75"
          )}
        />
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );

  return (
    <aside className="flex w-60 flex-col border-r border-[#111827] bg-[#020617] px-3 py-4 text-[13px] text-slate-300">
      <div className="mb-4 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">ORG</div>
      </div>

      <nav className="space-y-6">
        <div>
          <h3 className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            My Profile & Team
          </h3>
          <ul className="space-y-1">
            {mySection.map((item) => {
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

        <div>
          <h3 className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Organization
          </h3>
          <ul className="space-y-1">
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
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Shield className="h-3 w-3" />
              Org Admin
            </h3>
            <ul className="space-y-1">
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
