"use client";

import React from "react";

function ChipButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-black/60 hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

export function SavedViewsBar({
  views,
  onApply,
  onSave,
  onDelete,
  onPin,
  onSetDefault,
  canAdmin,
}: {
  views: any[];
  onApply: (v: any) => void;
  onSave: (opts: { name: string; shared: boolean }) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onSetDefault: (id: string, role: "VIEWER" | "EDITOR" | "ADMIN" | null) => void;
  canAdmin: boolean;
}) {
  const ordered = [...views].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {ordered.map((v) => (
        <div
          key={v.id}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-xs dark:border-white/10"
        >
          <button onClick={() => onApply(v)} className="hover:underline">
            {v.name}
          </button>

          {v.pinned ? (
            <span className="text-[10px] text-black/40 dark:text-white/40" title="Pinned">📌</span>
          ) : null}

          {canAdmin && v.shared ? (
            <select
              value={v.defaultForRole || ""}
              onChange={(e) => onSetDefault(v.id, (e.target.value || null) as any)}
              className="rounded-full border border-black/10 bg-transparent px-1.5 py-0.5 text-[10px] text-black/50 dark:border-white/10 dark:text-white/50"
              title="Default view for role"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">No default</option>
              <option value="VIEWER">Default: Viewer</option>
              <option value="EDITOR">Default: Editor</option>
              <option value="ADMIN">Default: Admin</option>
            </select>
          ) : null}

          <button
            onClick={() => onDelete(v.id)}
            className="hidden text-[10px] text-black/40 group-hover:block dark:text-white/40"
            title="Delete view"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          const name = prompt("View name");
          if (!name) return;
          const shared = canAdmin && confirm("Share with org?");
          onSave({ name, shared });
        }}
        className="shrink-0 rounded-full border border-black/10 bg-transparent px-2.5 py-1 text-xs text-black/60 hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
      >
        + Save current
      </button>
    </div>
  );
}

