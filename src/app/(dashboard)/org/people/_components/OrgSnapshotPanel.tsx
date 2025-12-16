import React from "react";

export function OrgSnapshotPanel({
  open,
  onToggle,
  counts,
}: {
  open: boolean;
  onToggle: () => void;
  counts: {
    total: number;      // full dataset total
    showing: number;    // filtered/visible total
    managers: number;   // filtered managers
    individuals: number;// filtered individuals
    incomplete: number; // filtered incomplete
  };
}) {
  const isFiltered = counts.showing !== counts.total;

  // Return plain content rows (no card/container styles)
  return (
    <>
      <div className="flex justify-between gap-4">
        <span className="text-black/50 dark:text-white/50">{isFiltered ? "Showing" : "All people"}</span>
        <span className="font-medium text-black/90 dark:text-white/90">{counts.showing}</span>
      </div>

      {isFiltered ? (
        <div className="flex justify-between gap-4">
          <span className="text-black/50 dark:text-white/50">Dataset total</span>
          <span className="font-medium text-black/90 dark:text-white/90">{counts.total}</span>
        </div>
      ) : null}

      <div className="flex justify-between gap-4">
        <span className="text-black/50 dark:text-white/50">Managers</span>
        <span className="font-medium text-black/90 dark:text-white/90">{counts.managers}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-black/50 dark:text-white/50">Individuals</span>
        <span className="font-medium text-black/90 dark:text-white/90">{counts.individuals}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-black/50 dark:text-white/50">Needs attention</span>
        <span className="font-medium text-black/90 dark:text-white/90">{counts.incomplete}</span>
      </div>
    </>
  );
}
