"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgPerson } from "@/types/org";

type DeletePersonModalProps = {
  person: OrgPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeletePersonModal({
  person,
  isOpen,
  onClose,
  onConfirm,
}: DeletePersonModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !person) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete person:", error);
      // Error handling is done by the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md",
          "bg-slate-900 border border-slate-700 rounded-lg",
          "shadow-xl",
          "p-6",
          "transform transition-all",
          isOpen ? "scale-100" : "scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className={cn(
            "absolute top-4 right-4",
            "flex items-center justify-center",
            "h-8 w-8 rounded",
            "text-slate-400 hover:text-slate-200",
            "hover:bg-slate-800",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            isDeleting && "opacity-50 cursor-not-allowed"
          )}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-100 mb-2">
          Delete {person.name || "person"}?
        </h2>

        {/* Message */}
        <p className="text-sm text-slate-400 mb-6">
          This cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2",
              "text-sm font-medium",
              "text-slate-300 hover:text-slate-100",
              "rounded-md",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              isDeleting && "opacity-50 cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2",
              "text-sm font-medium",
              "text-white",
              "bg-red-600 hover:bg-red-700",
              "rounded-md",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60",
              isDeleting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

