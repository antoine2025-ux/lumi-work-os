"use client";

import { useEffect } from "react";

type EditPanelProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function EditPanel({ open, title, children, onClose }: EditPanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 transition-opacity duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-panel-title"
    >
      <div
        className="h-full w-full max-w-md border-l border-border bg-background p-6 text-[13px] text-foreground shadow-xl transition-transform duration-150 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="edit-panel-title" className="text-[15px] font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg border border-border px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close edit panel"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

