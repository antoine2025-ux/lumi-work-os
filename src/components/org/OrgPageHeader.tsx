"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { OrgSetupGuideTrigger } from "./OrgSetupGuideTrigger";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type OrgPageHeaderProps = {
  breadcrumb?: string;
  title: string | React.ReactNode;
  description?: React.ReactNode;
  secondaryDescription?: React.ReactNode;
  actions?: React.ReactNode;
  showHelp?: boolean;
  showSetupGuide?: boolean; // Show setup guide only when needed (e.g., 0 people)
  backLink?: React.ReactNode; // Back link to show above title on the left
};

export function OrgPageHeader({ breadcrumb, title, description, secondaryDescription, actions, showHelp = true, showSetupGuide = false, backLink }: OrgPageHeaderProps) {
  
  return (
    <header className="flex flex-col gap-4 px-10 pt-4 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-2">
        {backLink && (
          <div>
            {backLink}
          </div>
        )}

<div className="flex items-center gap-2">
          <h1 className="mt-1 text-[20px] font-semibold text-slate-100">
            {title}
          </h1>
          {showHelp && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-slate-500 hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label="Help"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 bg-slate-900 border-white/10 text-slate-200"
                side="bottom"
                align="start"
              >
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-100">About this page</h3>
                  <div className="space-y-2 text-[13px] text-slate-300">
                    {description && (
                      <p>{typeof description === "string" ? description : "View and manage your organization."}</p>
                    )}
                    <p className="text-[12px] text-slate-400 pt-2 border-t border-white/5">
                      Click any person to see their full profile and connections.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] text-slate-400">
            {description}
          </p>
        ) : (
          <div className="mt-1 h-[20px]" aria-hidden="true" />
        )}
        {secondaryDescription && (
          <p className="mt-1 max-w-2xl text-[11px] text-slate-500">
            {secondaryDescription}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 flex-wrap">
        {showSetupGuide && (
          <OrgSetupGuideTrigger className="focus-ring rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" />
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
