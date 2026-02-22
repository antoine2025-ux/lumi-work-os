"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type OrgCrossTabLinkProps = {
  href: string;
  label: string;
  variant?: "default" | "subtle";
  showArrow?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * Consistent cross-tab navigation link component
 * Used throughout Org Center for navigation between tabs
 */
export function OrgCrossTabLink({
  href,
  label,
  variant = "default",
  showArrow = true,
  className,
  onClick,
}: OrgCrossTabLinkProps) {
  const baseClass = cn(
    "inline-flex items-center gap-1.5",
    "text-sm",
    "transition-colors duration-150",
    variant === "default"
      ? "text-primary hover:text-primary/80"
      : "text-slate-400 hover:text-slate-300",
    className
  );

  return (
    <Link
      href={href}
      onClick={onClick}
      className={baseClass}
    >
      <span>{label}</span>
      {showArrow && (
        <ArrowRight className="h-3.5 w-3.5" />
      )}
    </Link>
  );
}

