"use client";

import { useState, useEffect, useRef } from "react";
import { Building } from "lucide-react";
import { OrgStructureTeamCard } from "./OrgStructureTeamCard";
import { getDepartmentAccent } from "./accent-colors";
import { cn } from "@/lib/utils";
import type { OrgStructureDepartment } from "./normalized-types";

type OrgStructureTreeViewProps = {
  departments: OrgStructureDepartment[];
};

/**
 * Tree View - Premium horizontal org board with department lanes
 * Departments as columns, teams in responsive grid within each column
 */
export function OrgStructureTreeView({ departments }: OrgStructureTreeViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftHint, setShowLeftHint] = useState(false);
  const [showRightHint, setShowRightHint] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftHint(scrollLeft > 10);
      setShowRightHint(scrollLeft < scrollWidth - clientWidth - 10);
    };

    checkScroll();
    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  if (!departments.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-800 bg-slate-950/60 px-6 py-10 text-center text-sm text-slate-400">
        No structure defined yet. Add departments and teams to see your org tree.
      </div>
    );
  }

  return (
    <section className="relative">
      {/* Scrollable lanes container with snap scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory px-4 py-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(51 65 85 / 0.6) transparent",
        }}
      >
        {departments.map((dept, index) => (
          <DepartmentLane
            key={dept.id}
            department={dept}
            accentIndex={index}
          />
        ))}
      </div>

      {/* Scroll hint fades */}
      {showLeftHint && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent opacity-60" />
      )}
      {showRightHint && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent opacity-60" />
      )}
    </section>
  );
}

type DepartmentLaneProps = {
  department: OrgStructureDepartment;
  accentIndex: number;
};

/**
 * Single department lane in Tree View - Premium column design
 */
function DepartmentLane({ department, accentIndex }: DepartmentLaneProps) {
  const [isSelected, setIsSelected] = useState(false);
  const accent = getDepartmentAccent(accentIndex);
  const laneRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    setIsSelected(true);
    // Smooth scroll to center
    if (laneRef.current) {
      laneRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    setTimeout(() => setIsSelected(false), 200);
  };

  return (
    <div
      ref={laneRef}
      onClick={handleClick}
      className={cn(
        "group snap-start flex flex-col h-full basis-[360px] shrink-0 rounded-[32px] border border-white/5 bg-slate-900/40 shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:scale-[1.005] hover:shadow-[0_8px_32px_rgba(15,23,42,0.4)]",
        isSelected ? accent.selectedOutline : "hover:border-slate-700/60"
      )}
    >
      {/* Subtle top-glow accent on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[32px] bg-gradient-to-r from-blue-500/40 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Department header with icon + name + stats */}
      <header
        className={cn(
          "relative px-5 pt-5 pb-3 border-b border-slate-800/30",
          isSelected && accent.headerGlow
        )}
        style={{
          borderTopWidth: "2px",
          borderTopColor: accent.topBorderColor || "transparent",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              accent.iconBg,
              accent.iconBorder,
              "border",
              accent.iconGlow,
              "flex-shrink-0"
            )}
          >
            <Building className="h-5 w-5 text-slate-100" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">
            {department.name}
          </h2>
        </div>

        {/* Stats row - smaller, muted */}
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300/70">
          <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-0.5">
            {department.teamsCount} {department.teamsCount === 1 ? "team" : "teams"}
          </span>
          <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-0.5">
            {department.peopleCount} {department.peopleCount === 1 ? "person" : "people"}
          </span>
        </div>
      </header>

      {/* Teams section - 2-column grid with proper spacing */}
      {department.teams.length > 0 ? (
        <section className="mt-4 flex-1 px-5 pb-6">
          {/* Optional section label */}
          <div className="mb-4 border-t border-slate-800/40 pt-4">
            <div className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-400/40">
              Teams
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 items-stretch w-full">
            {department.teams.map((team) => (
              <div key={team.id} className="h-full">
                <OrgStructureTeamCard
                  team={team}
                  variant="tree"
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-4 flex-1 px-5 pb-6">
          <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-500 text-center">
            No teams yet
          </div>
        </section>
      )}
    </div>
  );
}
