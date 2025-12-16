"use client";

import { useState, useEffect } from "react";
import { trackOrgEvent } from "@/lib/org/track.client";

type Team = {
  id: string;
  name: string;
  memberCount?: number;
};

type TeamsDragListProps = {
  departmentId: string;
  teams: Team[];
  onReorder: (updates: { id: string; position: number }[]) => Promise<void>;
};

export function TeamsDragList({ departmentId, teams, onReorder }: TeamsDragListProps) {
  const [local, setLocal] = useState(teams);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocal(teams);
  }, [teams]);

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...local];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);

    setLocal(updated);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;

    const updates = local.map((t, i) => ({
      id: t.id,
      position: i,
    }));

    await onReorder(updates);

    trackOrgEvent({
      type: "ORG_CENTER_STRUCTURE_REORDER",
      category: "org_center",
      name: "Reordered teams",
      route: "/org/structure",
      meta: { departmentId },
    });

    setDraggedIndex(null);
  }

  return (
    <div className="space-y-2">
      {local.map((team, i) => (
        <div
          key={team.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
          className={`cursor-move rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[12px] text-slate-200 transition-all duration-150 hover:border-slate-700 hover:bg-slate-900/60 ${
            draggedIndex === i ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{team.name}</span>
            {team.memberCount !== undefined && (
              <span className="text-[11px] text-slate-500">
                {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

