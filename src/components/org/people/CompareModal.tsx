"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CompareHighlights } from "./CompareHighlights";
import type { OrgPerson } from "@/types/org";

type CompareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  people: OrgPerson[];
  allPeople: OrgPerson[];
  onRemovePerson: (personId: string) => void;
  onOpenPerson: (person: OrgPerson) => void;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function calculateTenure(joinedAt?: string | null): string | null {
  if (!joinedAt) return null;
  try {
    const joined = new Date(joinedAt);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    const totalMonths = years * 12 + months;
    
    if (totalMonths < 1) return "Less than 1 month";
    if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? "month" : "months"}`;
    if (years === 1 && months === 0) return "1 year";
    return `${years} ${years === 1 ? "year" : "years"}${months > 0 ? `, ${months} ${months === 1 ? "month" : "months"}` : ""}`;
  } catch {
    return null;
  }
}

/**
 * Compare modal for side-by-side comparison of 2-4 people
 */
export function CompareModal({
  isOpen,
  onClose,
  people,
  onRemovePerson,
  onOpenPerson,
}: CompareModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || people.length === 0) return null;

  // Derive manager names
  const managerMap = new Map<string, OrgPerson>();
  // TODO [BACKLOG]: Build manager map using person.managerId (data now available via OrgPosition.parentId)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-6xl max-h-[90vh] bg-card border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden transition-all duration-250"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <h2 id="compare-modal-title" className="text-xl font-semibold text-foreground">
            Compare People
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Highlights */}
          <CompareHighlights people={people} />

          {/* Comparison grid */}
          <div className={cn(
            "grid gap-6 mt-6",
            people.length === 2 && "grid-cols-2",
            people.length === 3 && "grid-cols-3",
            people.length === 4 && "grid-cols-4"
          )}>
            {people.map((person) => {
              const initials = getInitials(person.name);
              const tenure = calculateTenure(person.joinedAt);
              const manager = managerMap.get(person.id);

              return (
                <div
                  key={person.id}
                  className="flex flex-col space-y-4 p-5 rounded-2xl bg-muted/30 border border-white/5 transition-colors duration-150 hover:bg-muted/40"
                >
                  {/* Header: Avatar + Name + Remove */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 border border-white/10 shrink-0">
                        <AvatarFallback className="bg-slate-700 text-foreground text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenPerson(person)}
                          className="text-sm font-semibold text-foreground hover:text-primary truncate block text-left"
                        >
                          {person.name || <span className="text-muted-foreground italic">Unknown</span>}
                        </button>
                        {person.role ? (
                          <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic truncate" title="Role hasn't been set yet.">Not set</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemovePerson(person.id)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      aria-label="Remove from comparison"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Team</span>
                      {person.team ? (
                        <p className="text-foreground">{person.team}</p>
                      ) : (
                        <p className="text-muted-foreground italic" title="Team hasn't been set yet.">Not set</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Department</span>
                      {person.department ? (
                        <p className="text-foreground">{person.department}</p>
                      ) : (
                        <p className="text-muted-foreground italic" title="Department hasn't been set yet.">Not set</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Reports to</span>
                      {manager ? (
                        <p className="text-foreground">{manager.name}</p>
                      ) : (
                        <p className="text-muted-foreground italic" title="Manager hasn't been set yet.">Not set</p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Tenure</span>
                      {tenure ? (
                        <p className="text-foreground">{tenure}</p>
                      ) : (
                        <p className="text-muted-foreground italic" title={person.joinedAt ? "Unable to calculate tenure." : "Start date hasn't been set yet."}>Not set</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

