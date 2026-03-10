"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PeopleInsightsPanel } from "./PeopleInsightsPanel";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "./people-filters";

type PeopleInsightsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  people: OrgPerson[];
  filters: PeopleFilters;
  onFiltersChange: (filters: Partial<PeopleFilters>) => void;
  onScrollToTop?: () => void;
};

/**
 * People Insights Drawer (Mobile)
 * Opens as a drawer on mobile devices
 */
export function PeopleInsightsDrawer({
  isOpen,
  onClose,
  people,
  filters,
  onFiltersChange,
  onScrollToTop,
}: PeopleInsightsDrawerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md bg-card border-white/10 text-foreground max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(_e) => {
          // Allow closing on outside click
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-foreground">
              People Insights
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <PeopleInsightsPanel
            people={people}
            filters={filters}
            onFiltersChange={(newFilters) => {
              onFiltersChange(newFilters);
              onClose();
            }}
            onScrollToTop={onScrollToTop}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

