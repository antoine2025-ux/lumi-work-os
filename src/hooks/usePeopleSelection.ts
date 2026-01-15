"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "org.people.selectedIds";

/**
 * Hook for managing people selection state
 * Persists selected IDs to localStorage
 */
export function usePeopleSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSelectedIds(new Set(ids));
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (selectedIds.size > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedIds)));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [selectedIds, isHydrated]);

  const toggleSelection = useCallback((personId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((personIds: string[]) => {
    setSelectedIds(new Set(personIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (personId: string) => {
      return selectedIds.has(personId);
    },
    [selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}

