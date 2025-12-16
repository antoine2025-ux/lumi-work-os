"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type OrgEmptyStateProps = {
  title: string;
  description: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  primaryActionOnClick?: () => void;
  primaryAction?: React.ReactNode; // Allow custom ReactNode for primary action (e.g., dialog trigger)
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionOnClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export function OrgEmptyState({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  primaryActionOnClick,
  primaryAction,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionOnClick,
  icon,
  className,
}: OrgEmptyStateProps) {
  const PrimaryButton = primaryActionHref ? Link : "button";
  const SecondaryButton = secondaryActionHref ? Link : "button";
  
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] px-6 py-8 text-center md:text-left",
        className
      )}
    >
      {icon && <div className="mb-4 flex justify-center md:justify-start">{icon}</div>}
      <div className="space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-100">
          {title}
        </h2>
        <p className="max-w-xl text-[13px] text-slate-400">
          {description}
        </p>
      </div>

      {(primaryActionLabel || primaryAction || secondaryActionLabel) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
          {primaryAction ? (
            primaryAction
          ) : primaryActionLabel ? (
            <PrimaryButton
              {...(primaryActionHref ? { href: primaryActionHref } : { onClick: primaryActionOnClick })}
              className="focus-ring inline-flex items-center rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-white transition-all duration-200 hover:bg-primary/90 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              aria-label={primaryActionLabel}
            >
              {primaryActionLabel}
            </PrimaryButton>
          ) : null}

          {secondaryActionLabel && (
            <SecondaryButton
              {...(secondaryActionHref ? { href: secondaryActionHref } : { onClick: secondaryActionOnClick })}
              className="focus-ring inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-[12px] font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-slate-800/50 hover:text-slate-50 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              aria-label={secondaryActionLabel}
            >
              {secondaryActionLabel}
            </SecondaryButton>
          )}
        </div>
      )}
    </div>
  );
}

