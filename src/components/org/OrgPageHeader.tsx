"use client";

import * as React from "react";
import Link from "next/link";
import { HelpCircle, ChevronLeft } from "lucide-react";
import { OrgSetupGuideTrigger } from "./OrgSetupGuideTrigger";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Resolve back action based on the `from` query parameter.
 * Returns null if `from` is not recognized or not provided.
 */
export function resolveBackAction(from: string | null): { label: string; href: string } | null {
  if (!from) return null;
  
  const backTargets: Record<string, { label: string; href: string }> = {
    issues: { label: "Back to Issues", href: "/org/issues" },
    intelligence: { label: "Back to Intelligence", href: "/org/intelligence" },
    structure: { label: "Back to Structure", href: "/org/structure" },
    people: { label: "Back to People", href: "/org/people" },
    ownership: { label: "Back to Ownership", href: "/org/ownership" },
  };
  
  return backTargets[from] || null;
}

type OrgPageHeaderProps = {
  title: string | React.ReactNode;
  description?: React.ReactNode;
  
  // Legacy support (deprecated, but keep for migration)
  legacyBreadcrumb?: string;
  
  // New structured API
  breadcrumb?: Array<{
    label: string;
    href?: string;
  }>;
  
  backAction?: {
    label: string;
    href: string;
  };
  
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  
  secondaryActions?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
  }>;
  
  // Existing props (keep for backward compatibility)
  secondaryDescription?: React.ReactNode;
  actions?: React.ReactNode;
  showHelp?: boolean;
  showSetupGuide?: boolean; // Show setup guide only when needed (e.g., 0 people)
  backLink?: React.ReactNode; // Back link to show above title on the left (deprecated, use backAction)
};

export function OrgPageHeader({ 
  title, 
  description, 
  legacyBreadcrumb,
  breadcrumb,
  backAction,
  primaryAction,
  secondaryActions,
  secondaryDescription, 
  actions, 
  showHelp = true, 
  showSetupGuide = false, 
  backLink 
}: OrgPageHeaderProps) {
  // Determine which breadcrumb to render
  const renderBreadcrumb = () => {
    // New structured breadcrumb (priority)
    if (Array.isArray(breadcrumb) && breadcrumb.length >= 2) {
      return (
        <nav className="flex items-center gap-1 text-[12px] text-muted-foreground mb-2" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-muted-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-muted-foreground" : ""}>
                    {item.label}
                  </span>
                )}
                {!isLast && <span className="text-slate-600">/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      );
    }
    
    // Legacy breadcrumb (fallback)
    if (legacyBreadcrumb) {
      return (
        <nav className="flex items-center text-[12px] text-muted-foreground mb-2" aria-label="Breadcrumb">
          {legacyBreadcrumb}
        </nav>
      );
    }
    
    return null;
  };

  // Render back action
  const renderBackAction = () => {
    if (backAction) {
      return (
        <Link
          href={backAction.href}
          className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-muted-foreground transition-colors mb-2 group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          {backAction.label}
        </Link>
      );
    }
    
    // Legacy backLink support
    if (backLink) {
      return <div className="mb-2">{backLink}</div>;
    }
    
    return null;
  };

  // Render actions (primary and secondary)
  const renderActions = () => {
    const hasNewActions = primaryAction || (secondaryActions && secondaryActions.length > 0);
    const hasLegacyActions = actions;
    
    // Always render actions container if setup guide or any actions exist
    if (!showSetupGuide && !hasNewActions && !hasLegacyActions) {
      return null;
    }

    return (
      <div className="flex shrink-0 items-center gap-2 flex-wrap">
        {showSetupGuide && (
          <OrgSetupGuideTrigger className="focus-ring rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" />
        )}
        
        {hasNewActions && (
          <>
            {secondaryActions && secondaryActions.length > 0 && (
              <div className="flex items-center gap-2">
                {secondaryActions.map((action, index) => {
                  if (action.href) {
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={action.href}>{action.label}</Link>
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}
            {primaryAction && (
              <>
                {primaryAction.href ? (
                  <Button size="sm" asChild>
                    <Link href={primaryAction.href}>{primaryAction.label}</Link>
                  </Button>
                ) : (
                  <Button size="sm" onClick={primaryAction.onClick}>
                    {primaryAction.label}
                  </Button>
                )}
              </>
            )}
          </>
        )}
        
        {hasLegacyActions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  };

  return (
    <header className="flex flex-col gap-4 px-10 pt-4 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-2">
        {renderBreadcrumb()}
        {renderBackAction()}

        <div className="flex items-center gap-2">
          <h1 className="mt-1 text-[20px] font-semibold text-foreground">
            {title}
          </h1>
          {showHelp && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label="Help"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 bg-card border-white/10 text-foreground"
                side="bottom"
                align="start"
              >
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">About this page</h3>
                  <div className="space-y-2 text-[13px] text-muted-foreground">
                    {description && (
                      <p>{typeof description === "string" ? description : "View and manage your organization."}</p>
                    )}
                    <p className="text-[12px] text-muted-foreground pt-2 border-t border-white/5">
                      Click any person to see their full profile and connections.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : (
          <div className="mt-1 h-[20px]" aria-hidden="true" />
        )}
        {secondaryDescription && (
          <p className="mt-1 max-w-2xl text-[11px] text-muted-foreground">
            {secondaryDescription}
          </p>
        )}
      </div>

      {renderActions()}
    </header>
  );
}
