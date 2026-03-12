"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type OrgEmptyStateProps = {
  title: string;
  description: string | React.ReactNode;
  variant?: "empty" | "good" | "incomplete";
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
  variant = "empty",
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
  // Determine styling based on variant
  const variantStyles = {
    empty: "border-white/5 bg-card/80",
    good: "border-green-500/20 bg-green-950/20",
    incomplete: "border-amber-500/20 bg-amber-950/20",
  };
  
  const variantStyle = variantStyles[variant];
  
  // For "good" variant, suppress primary action CTA (only show if explicitly provided as secondary)
  const showPrimaryAction = variant !== "good" || !primaryActionLabel;
  
  return (
    <div
      className={cn(
        "rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.25)] px-6 py-8 text-center md:text-left",
        variantStyle,
        className
      )}
    >
      {icon && <div className="mb-4 flex justify-center md:justify-start">{icon}</div>}
      <div className="space-y-2">
        <h2 className="text-[15px] font-semibold text-foreground">
          {title}
        </h2>
        <p className="max-w-xl text-[13px] text-muted-foreground">
          {description}
        </p>
      </div>

      {((showPrimaryAction && (primaryActionLabel || primaryAction)) || secondaryActionLabel) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
          {primaryAction ? (
            primaryAction
          ) : primaryActionLabel && showPrimaryAction ? (
            primaryActionHref ? (
              <Link
                href={primaryActionHref}
                className={cn(
                  "focus-ring inline-flex items-center rounded-lg px-4 py-2 text-[12px] font-medium transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                  variant === "good" 
                    ? "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    : "bg-primary text-foreground hover:bg-primary/90"
                )}
                aria-label={primaryActionLabel}
              >
                {primaryActionLabel}
              </Link>
            ) : (
              <button
                onClick={primaryActionOnClick}
                className={cn(
                  "focus-ring inline-flex items-center rounded-lg px-4 py-2 text-[12px] font-medium transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                  variant === "good" 
                    ? "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    : "bg-primary text-foreground hover:bg-primary/90"
                )}
                aria-label={primaryActionLabel}
              >
                {primaryActionLabel}
              </button>
            )
          ) : null}

          {secondaryActionLabel && (
            secondaryActionHref ? (
              <Link
                href={secondaryActionHref}
                className="focus-ring inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-white/20 hover:bg-muted/50 hover:text-foreground hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                aria-label={secondaryActionLabel}
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                onClick={secondaryActionOnClick}
                className="focus-ring inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-white/20 hover:bg-muted/50 hover:text-foreground hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                aria-label={secondaryActionLabel}
              >
                {secondaryActionLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

