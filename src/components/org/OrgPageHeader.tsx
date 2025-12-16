"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { OrgHelpPanel } from "@/components/org/help/OrgHelpPanel";

type OrgPageHeaderProps = {
  breadcrumb?: string;
  title: string | React.ReactNode;
  description?: React.ReactNode;
  secondaryDescription?: React.ReactNode;
  actions?: React.ReactNode;
  showHelp?: boolean;
};

export function OrgPageHeader({ breadcrumb, title, description, secondaryDescription, actions, showHelp = true }: OrgPageHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const learnMoreButtonRef = useRef<HTMLButtonElement>(null);
  
  // Generate breadcrumb from title if not provided
  const titleString = typeof title === "string" ? title : "People";
  const displayBreadcrumb = breadcrumb || `ORG / ${titleString.toUpperCase()}`;
  
  const handleClose = () => {
    setHelpOpen(false);
    // Return focus to Learn more button after drawer closes
    setTimeout(() => {
      learnMoreButtonRef.current?.focus();
    }, 100);
  };
  
  return (
    <header className="flex flex-col gap-4 px-10 pt-8 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1 min-h-[80px]">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">
          {displayBreadcrumb}
        </p>

        <h1 className="mt-1 text-[20px] font-semibold text-slate-100">
          {title}
        </h1>

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

      <div className="flex shrink-0 items-center gap-3">
        {showHelp && (
          <button
            ref={learnMoreButtonRef}
            type="button"
            onClick={() => setHelpOpen(true)}
            className="focus-ring rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="Learn more about Org Center"
          >
            Learn more
          </button>
        )}
        {actions && <div>{actions}</div>}
      </div>
      <OrgHelpPanel open={helpOpen} onClose={handleClose} />
    </header>
  );
}
