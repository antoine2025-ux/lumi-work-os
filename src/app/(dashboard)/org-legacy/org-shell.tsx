"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import OrgUtilitiesPanel from "./org-utilities-panel";
import { useCurrentOrg } from "./org-context";

const TABS = [
  { label: "Overview", href: "/org" },
  { label: "People", href: "/org/people" },
  { label: "Org Chart", href: "/org/chart" },
  { label: "Projects", href: "/org/projects" },
];

export default function OrgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const { orgId } = useCurrentOrg();

  return (
    <div className="px-6 py-6 space-y-4">
      <OrgHeader pathname={pathname} onUtilitiesClick={() => setUtilitiesOpen(true)} />
      <div>{children}</div>
      {utilitiesOpen && orgId ? (
        <OrgUtilitiesPanel onClose={() => setUtilitiesOpen(false)} orgId={orgId} />
      ) : null}
    </div>
  );
}

function OrgHeader({ pathname, onUtilitiesClick }: { pathname: string; onUtilitiesClick: () => void }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold">Org</div>
          <div className="mt-1 text-sm text-black/50 dark:text-white/50">
            Model structure, ownership, and capacity — consistent across tabs.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onUtilitiesClick}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Utilities
          </button>
          <div className="text-xs text-black/40 dark:text-white/40">
            Home / Org / {tabLabelFromPath(pathname)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "rounded-xl border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-black/20 bg-black text-white dark:border-white/20 dark:bg-white dark:text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/org") return pathname === "/org" || pathname === "/org/";
  return pathname === href || pathname.startsWith(href + "/");
}

function tabLabelFromPath(pathname: string) {
  if (pathname.startsWith("/org/people")) return "People";
  if (pathname.startsWith("/org/chart")) return "Org Chart";
  if (pathname.startsWith("/org/projects")) return "Projects";
  return "Overview";
}

