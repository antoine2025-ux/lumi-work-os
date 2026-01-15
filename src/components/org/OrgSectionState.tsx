/**
 * Org Section State Components
 * 
 * Reusable UI components for consistent loading, error, and empty states
 * across Org sections. Provides user-safe messaging without exposing internals.
 */

"use client";

import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function OrgSectionLoading({ label }: { label: string }) {
  return <div className="text-sm text-muted-foreground">Loading {label}…</div>;
}

export function OrgSectionError({ title, message }: { title: string; message?: string }) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message || "Failed to load. Please try again."}</AlertDescription>
    </Alert>
  );
}

export function OrgSectionEmpty({ 
  title, 
  description,
  ctaLabel,
  ctaHref 
}: { 
  title: string; 
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children?: ReactNode;
}) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <div>{description || "No data yet."}</div>
        {ctaLabel && ctaHref && (
          <Button asChild size="sm" variant="secondary">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

