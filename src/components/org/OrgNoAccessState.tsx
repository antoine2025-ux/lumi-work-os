"use client";

import { cn } from "@/lib/utils";

type OrgNoAccessStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

const defaultTitle = "You don't have access to this Org Center";
const defaultDescription =
  "Ask an owner or admin to grant you access, or switch organizations.";

export function OrgNoAccessState({
  title = defaultTitle,
  description = defaultDescription,
  className,
}: OrgNoAccessStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] px-6 py-6 text-sm text-slate-300",
        className
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span>Next steps:</span>
        <ul className="flex flex-wrap gap-2">
          <li>• Confirm you're in the correct org.</li>
          <li>• Ask an Org Owner/Admin to grant you access.</li>
        </ul>
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        If you have multiple workspaces, try switching orgs from your main Loopwell navigation.
      </div>
    </div>
  );
}

