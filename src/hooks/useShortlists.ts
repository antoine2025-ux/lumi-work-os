"use client";

import { useState, useEffect, useCallback } from "react";

export type Shortlist = {
  id: string;
  name: string;
  createdAt: number;
  personIds: string[];
};

const STORAGE_KEY = "org.people.shortlists";

/**
 * Hook for managing shortlists
 * Persists shortlists to localStorage
 */
export function useShortlists() {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Shortlist[];
        // Validate structure
        if (Array.isArray(parsed)) {
          setShortlists(parsed);
        }
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shortlists));
    } catch {
      // Ignore storage errors
    }
  }, [shortlists, isHydrated]);

  const createShortlist = useCallback((name: string, personIds: string[]) => {
    const newShortlist: Shortlist = {
      id: `shortlist-${Date.now()}`,
      name,
      createdAt: Date.now(),
      personIds,
    };
    setShortlists((prev) => [...prev, newShortlist]);
    return newShortlist;
  }, []);

  const deleteShortlist = useCallback((id: string) => {
    setShortlists((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getShortlist = useCallback(
    (id: string) => {
      return shortlists.find((s) => s.id === id);
    },
    [shortlists]
  );

  return {
    shortlists,
    createShortlist,
    deleteShortlist,
    getShortlist,
  };
}

