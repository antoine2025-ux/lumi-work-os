"use client";

import { useEffect } from "react";

export function useKeyboardShortcuts({
  onToggleFocus,
  onPrimaryAction,
}: {
  onToggleFocus: () => void;
  onPrimaryAction: () => void;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          onToggleFocus();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          onPrimaryAction();
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggleFocus, onPrimaryAction]);
}

