"use client";

import React from "react";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; admin?: boolean };

export function SettingsNav({
  role,
}: {
  role: "VIEWER" | "EDITOR" | "ADMIN";
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { label: "Members", href: "/org/settings/members", admin: true },
    { label: "Invitations", href: "/org/settings/invitations", admin: true },
    { label: "Archived people", href: "/org/settings/archived-people", admin: true },
    { label: "LoopBrain", href: "/org/settings/loopbrain", admin: true },
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-medium text-black/60 dark:text-white/60">
        Settings
      </div>
      <div className="mt-2 space-y-1">
        {items
          .filter((i) => !i.admin || role === "ADMIN")
          .map((i) => {
            const active = pathname?.startsWith(i.href);
            return (
              <a
                key={i.href}
                href={i.href}
                className={[
                  "block rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                ].join(" ")}
              >
                {i.label}
              </a>
            );
          })}
      </div>
      {role !== "ADMIN" ? (
        <div className="mt-2 text-xs text-black/50 dark:text-white/50">
          Some settings are admin-only.
        </div>
      ) : null}
    </div>
  );
}

