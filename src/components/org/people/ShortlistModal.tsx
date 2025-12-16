"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ShortlistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  personCount: number;
};

/**
 * Modal for saving a shortlist
 */
export function ShortlistModal({
  isOpen,
  onClose,
  onSave,
  personCount,
}: ShortlistModalProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Save Shortlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Leadership candidates"
              className="bg-slate-800 border-slate-700 text-slate-100"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">
              {personCount} {personCount === 1 ? "person" : "people"} will be saved
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

