"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OrgStructureDepartmentCard } from "./OrgStructureDepartmentCard";
import { OrgStructureTeamCard } from "./OrgStructureTeamCard";
import { getDepartmentAccent } from "./accent-colors";
import { cn } from "@/lib/utils";
import type { OrgStructureDepartment } from "./normalized-types";

type OrgStructureListViewProps = {
  departments: OrgStructureDepartment[];
};

/**
 * List View - Polished accordion layout with left rail
 * One department per row that expands to show teams
 */
export function OrgStructureListView({ departments }: OrgStructureListViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-3.5">
      {departments.map((dept, index) => {
        const isOpen = dept.id === openId;
        const accent = getDepartmentAccent(index);

        return (
          <section
            key={dept.id}
            className={cn(
              "relative overflow-hidden rounded-[24px] border border-border/60 bg-background/70 transition-all duration-150",
              "hover:scale-[1.005] hover:shadow-[0_8px_32px_rgba(15,23,42,0.4)] hover:border-border/80"
            )}
          >
            {/* Department header */}
            <OrgStructureDepartmentCard
              department={dept}
              isExpanded={isOpen}
              onToggle={() => toggle(dept.id)}
              showChevron={dept.teams.length > 0}
              accent={accent}
              variant="list"
            />

            {/* Expanded content with teams and left rail */}
            <AnimatePresence>
              {isOpen && dept.teams.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div
                    id={`teams-${dept.id}`}
                    className="relative border-t border-border/50 bg-background/50 px-5 pb-4 pt-3.5"
                  >
                    {/* Left rail */}
                    <div className="pointer-events-none absolute left-5 top-3.5 bottom-4 w-px bg-muted/70" />

                    {/* Teams container with left padding to align with rail */}
                    <div className="flex flex-col gap-2.5 pl-7">
                      {dept.teams.map((team, teamIndex) => (
                        <motion.div
                          key={team.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: teamIndex * 0.03,
                            ease: "easeOut",
                          }}
                        >
                          <OrgStructureTeamCard team={team} variant="list" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
