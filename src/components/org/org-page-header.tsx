import * as React from "react";
import { cn } from "@/lib/utils";

type OrgPageHeaderSize = "default" | "compact";

type OrgPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode; // optional: toolbar row (search/filters)
  className?: string;
  size?: OrgPageHeaderSize;
};

export function OrgPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  size = "compact", // IMPORTANT: match People page feel by default
}: OrgPageHeaderProps) {
  const titleClass =
    size === "compact"
      ? "text-xl font-semibold leading-tight"
      : "text-2xl font-semibold leading-tight";

  const descriptionClass =
    size === "compact"
      ? "text-sm leading-6"
      : "text-sm leading-6";

  const eyebrowClass =
    size === "compact"
      ? "text-xs tracking-wide"
      : "text-xs tracking-wide";

  const topGap = size === "compact" ? "mt-0.5" : "mt-1";
  const descGap = size === "compact" ? "mt-1.5" : "mt-2";
  const toolbarGap = size === "compact" ? "mt-3" : "mt-4";

  return (
    <div className={cn("flex items-start justify-between gap-6", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className={cn(eyebrowClass, "text-muted-foreground/80")}>
            {eyebrow}
          </div>
        ) : null}

        <div className={cn(topGap, "flex items-center gap-2")}>
          <h1 className={cn(titleClass, "text-foreground")}>{title}</h1>
        </div>

        {description ? (
          <p className={cn(descGap, descriptionClass, "max-w-3xl text-muted-foreground")}>
            {description}
          </p>
        ) : null}

        {children ? <div className={toolbarGap}>{children}</div> : null}
      </div>

      {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
    </div>
  );
}

