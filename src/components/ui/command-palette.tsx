"use client";

import { useState, useEffect } from "react";
import { UnifiedSearchDialog } from "@/components/search/UnifiedSearchDialog";

/**
 * Global command palette / unified search.
 * Opens via Cmd+K (Mac) / Ctrl+K (Windows) or openCommandPalette event.
 * Renders UnifiedSearchDialog for searching wiki, projects, tasks, and people.
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    document.addEventListener("openCommandPalette", handleOpen);
    return () => document.removeEventListener("openCommandPalette", handleOpen);
  }, []);

  return (
    <UnifiedSearchDialog
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  );
}
