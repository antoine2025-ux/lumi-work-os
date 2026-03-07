"use client";

import { cn } from "@/lib/utils";

export type OrgTab = {
  id: string;
  label: string;
  badge?: string | number;
};

type OrgTabNavProps = {
  tabs: OrgTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function OrgTabNav({
  tabs,
  activeId,
  onChange,
  className,
}: OrgTabNavProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-[#050816] p-1 text-[12px]",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all duration-150",
              active
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  active
                    ? "bg-card text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
