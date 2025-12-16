"use client";

import { useState } from "react";
import { ChevronDown, Bookmark, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shortlist } from "@/hooks/useShortlists";

type ShortlistsDropdownProps = {
  shortlists: Shortlist[];
  activeShortlistId?: string;
  onSelectShortlist: (shortlistId: string) => void;
  onDeleteShortlist: (shortlistId: string) => void;
  onClearShortlist: () => void;
  className?: string;
};

/**
 * Shortlists dropdown component
 * Shows saved shortlists and allows selection/deletion
 */
export function ShortlistsDropdown({
  shortlists,
  activeShortlistId,
  onSelectShortlist,
  onDeleteShortlist,
  onClearShortlist,
  className,
}: ShortlistsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeShortlist = activeShortlistId
    ? shortlists.find((s) => s.id === activeShortlistId)
    : undefined;

  if (shortlists.length === 0 && !activeShortlist) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2",
          "rounded-full",
          "px-4 py-1.5",
          "text-sm",
          "bg-slate-900/40",
          "text-foreground/60",
          "hover:bg-slate-900/60",
          "hover:text-foreground/80",
          "transition-colors",
          "border border-slate-800/70",
          activeShortlist && "border-primary/30 bg-primary/10 text-primary"
        )}
      >
        <Bookmark className="h-4 w-4" />
        <span>{activeShortlist?.name || "Shortlists"}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg border border-slate-800/70 bg-slate-900 shadow-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {activeShortlist && (
                <div className="p-2 border-b border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => {
                      onClearShortlist();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    <span>Clear filter</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {shortlists.map((shortlist) => (
                <div
                  key={shortlist.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 hover:bg-slate-800/50 transition-colors",
                    activeShortlistId === shortlist.id && "bg-slate-800/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectShortlist(shortlist.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left text-sm text-slate-200"
                  >
                    {shortlist.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteShortlist(shortlist.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    aria-label="Delete shortlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

