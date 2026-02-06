"use client";

/**
 * Standardized CTA buttons for Org pages.
 *
 * Scope constraint: These components standardize only button components and
 * variants. No copy, layout, spacing, or iconography changes are included.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Button>;

/** Primary action (e.g. "Add person", "Assign", "Fix") */
export function OrgPrimaryCta({ className, ...props }: Props) {
  return (
    <Button
      {...props}
      variant="default"
      className={cn("rounded-xl", className)}
    />
  );
}

/** Secondary action (e.g. "Cancel", "Skip") */
export function OrgSecondaryCta({ className, ...props }: Props) {
  return (
    <Button
      {...props}
      variant="secondary"
      className={cn("rounded-xl", className)}
    />
  );
}

/** Ghost/subtle action (e.g. "View all", "Dismiss") */
export function OrgGhostCta({ className, ...props }: Props) {
  return (
    <Button
      {...props}
      variant="ghost"
      className={cn("rounded-xl", className)}
    />
  );
}
