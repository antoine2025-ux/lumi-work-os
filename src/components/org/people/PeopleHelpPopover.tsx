"use client";

import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Help popover explaining the People page
 */
export function PeopleHelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center",
            "h-5 w-5 rounded-full",
            "text-muted-foreground hover:text-muted-foreground",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            "ml-2"
          )}
          aria-label="Help: What is this page?"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 bg-card border-white/10 text-foreground"
        side="bottom"
        align="start"
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">About the People page</h3>
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <p>
              Browse everyone in your organization. View profiles, understand reporting lines, and explore team structures.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Views:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
                <li><strong>Cards:</strong> Visual grid with key details</li>
                <li><strong>Table:</strong> Compact list view for quick scanning</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Features:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
                <li><strong>Filters:</strong> Narrow by team, department, role, or search</li>
                <li><strong>Compare:</strong> Select 2-4 people to see side-by-side</li>
                <li><strong>Shortlists:</strong> Save groups for quick access</li>
              </ul>
            </div>
            <p className="text-[12px] text-muted-foreground pt-2 border-t border-white/5">
              Click any person to see their full profile and connections.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

