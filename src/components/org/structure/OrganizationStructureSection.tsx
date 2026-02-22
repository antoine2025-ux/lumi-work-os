"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ViewModeToggle } from "./ViewModeToggle";
import { OrgStructureListView } from "./OrgStructureListView";
import { OrgStructureTreeView } from "./OrgStructureTreeView";
import { normaliseOrgStructure } from "./normalize";
import type { StructureDepartment, StructureTeam } from "@/types/org";
import type { ViewMode } from "./types";
import type { OrgStructureDepartment } from "./normalized-types";

type OrganizationStructureSectionProps = {
  departments: StructureDepartment[];
  teams: StructureTeam[] | null;
};

/**
 * Main Organization Structure section component
 * Supports both List and Tree view modes with persistence
 */
export function OrganizationStructureSection({
  departments,
  teams,
}: OrganizationStructureSectionProps) {
  // Initialize view mode to "list" to match server render (prevents hydration mismatch)
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load view mode from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const saved = localStorage.getItem("orgStructureViewMode");
    if (saved === "list" || saved === "tree") {
      setViewMode(saved);
    }
  }, []);

  // Persist view mode to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("orgStructureViewMode", viewMode);
    }
  }, [viewMode, isHydrated]);

  // Normalize data for both views
  const normalizedDepartments: OrgStructureDepartment[] = useMemo(
    () => normaliseOrgStructure(departments, teams),
    [departments, teams]
  );


  return (
    <section className="mt-12 pb-8 border-b border-slate-800/30">
      <header className="mb-10">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="space-y-1.5 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Organization structure
            </h2>
            <p className="text-sm text-slate-500/70">
              Departments, teams, and key leads at a glance.
            </p>
          </div>
        </div>
        {/* Subheadline with toggle aligned right */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500/60">
            {viewMode === "list"
              ? "List view · Scan departments vertically."
              : "Org tree · Compare departments side by side."}
          </p>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </header>

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "list" ? (
            <motion.div
              key="org-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <OrgStructureListView departments={normalizedDepartments} />
            </motion.div>
          ) : (
            <motion.div
              key="org-tree"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <OrgStructureTreeView departments={normalizedDepartments} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

