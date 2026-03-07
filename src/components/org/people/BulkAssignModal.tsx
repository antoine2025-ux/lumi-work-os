"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BulkAssignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "team" | "department" | "manager";
  selectedCount: number;
  availableTeams?: Array<{ id: string; name: string }>;
  availableDepartments?: Array<{ id: string; name: string }>;
  availablePeople?: Array<{ id: string; name: string }>;
  onConfirm: (targetId: string) => void;
};

/**
 * Modal for bulk assigning team, department, or manager
 */
export function BulkAssignModal({
  isOpen,
  onClose,
  type,
  selectedCount,
  availableTeams = [],
  availableDepartments = [],
  availablePeople = [],
  onConfirm,
}: BulkAssignModalProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  const getTitle = () => {
    switch (type) {
      case "team":
        return "Assign team";
      case "department":
        return "Assign department";
      case "manager":
        return "Assign manager";
    }
  };

  const getOptions = () => {
    switch (type) {
      case "team":
        return availableTeams;
      case "department":
        return availableDepartments;
      case "manager":
        return availablePeople;
    }
  };

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
      setSelectedId("");
      onClose();
    }
  };

  const options = getOptions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {getTitle()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Assign {selectedCount} {selectedCount === 1 ? "person" : "people"} to a {type === "manager" ? "manager" : type}.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Select {type === "manager" ? "manager" : type}:
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-white/10 bg-muted/50",
                "px-3 py-2",
                "text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/60",
                "transition-colors"
              )}
            >
              <option value="">Choose {type === "manager" ? "a manager" : `a ${type}`}...</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="bg-primary/20 text-primary hover:bg-primary/30"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

