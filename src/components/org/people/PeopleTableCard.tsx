"use client";

import { cn } from "@/lib/utils";
import { surfaceCardClass } from "./people-styles";
import type { ReactNode } from "react";

type PeopleTableCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Premium table container with rounded card styling and sticky header
 * Matches Org Chart tile aesthetic
 */
export function PeopleTableCard({ children, className }: PeopleTableCardProps) {
  return (
    <div
      className={cn(
        surfaceCardClass,
        "w-full",
        "overflow-hidden", // Ensures sticky header is clipped
        className
      )}
    >
      {children}
    </div>
  );
}

