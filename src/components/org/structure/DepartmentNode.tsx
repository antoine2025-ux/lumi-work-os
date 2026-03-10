"use client";

import { useState } from "react";
import { Building, ChevronDown } from "lucide-react";
import type { OrgTreeNode } from "./types";

type DepartmentNodeProps = {
  node: OrgTreeNode;
  open: boolean;
  onToggle: () => void;
};

/**
 * Presentational component for a department node in Tree View
 */
export function DepartmentNode({ node, open, onToggle }: DepartmentNodeProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  const handleMouseDown = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 60);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      className={`group relative flex items-center justify-between rounded-2xl border transition-all duration-200 cursor-pointer ${
        open
          ? "border-blue-500/50 bg-gradient-to-b from-slate-900/80 to-slate-950/60 shadow-[0_0_12px_rgba(90,145,255,0.25)]"
          : "border-border/50 bg-gradient-to-b from-[#020617] to-slate-950/80 hover:-translate-y-[1px] hover:border-border/60 hover:shadow-md hover:shadow-slate-900/50 hover:shadow-[0_0_0_2px_rgba(90,145,255,0.35)] hover:ring-1 hover:ring-blue-400/40"
      }`}
      style={{
        transition: "transform 200ms ease, box-shadow 120ms ease-in-out, ring 120ms ease-in-out, border-color 200ms ease, background 200ms ease",
        transform: isPressed ? "scale(0.99)" : undefined,
      }}
      aria-expanded={open}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0 p-5 md:p-6">
        {/* Department icon in blue pill */}
        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
          <Building className="h-4.5 w-4.5 text-blue-400" />
        </div>
        
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Department name - primary focus */}
          <span className="text-xl font-semibold text-foreground">
            {node.name}
          </span>
          
          {/* Metadata badges */}
          {node.teamCount !== undefined && node.teamCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {node.teamCount} {node.teamCount === 1 ? "team" : "teams"}
              </span>
              {node.peopleCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {node.peopleCount} {node.peopleCount === 1 ? "person" : "people"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chevron icon */}
      {node.children && node.children.length > 0 && (
        <div className={`flex-shrink-0 mr-5 md:mr-6 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          open 
            ? "bg-muted/50" 
            : "group-hover:bg-muted/50"
        }`}>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transform transition-transform duration-220 ease-in-out ${
              open ? "rotate-180 text-blue-400" : "rotate-0 group-hover:text-muted-foreground"
            }`}
          />
        </div>
      )}
    </div>
  );
}

