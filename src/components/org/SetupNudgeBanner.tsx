/**
 * Setup Nudge Banner Component
 * 
 * Provides contextual guidance for incomplete Org setup steps.
 * Used across People, Structure, and Ownership pages to guide users.
 */

"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SetupNudgeBanner({
  title,
  message,
  ctaLabel,
  href,
  severity = "warning",
}: {
  title: string;
  message: string;
  ctaLabel: string;
  href: string;
  severity?: "warning" | "info";
}) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[SetupNudgeBanner] Navigating to:', href, 'from:', pathname);
    
    // Always use window.location.href for reliable navigation, even if on same page
    // This ensures the page always refreshes and navigation is visible
    window.location.href = href;
  };

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{title}</div>
            <Badge variant={severity === "warning" ? "destructive" : "secondary"}>
              {severity === "warning" ? "Setup required" : "Tip"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">{message}</div>
        </div>
        <Button 
          size="sm" 
          onClick={handleClick}
          type="button"
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

