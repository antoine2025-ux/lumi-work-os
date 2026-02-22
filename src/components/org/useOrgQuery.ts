/**
 * Simple query hook for Org API calls.
 * 
 * Provides loading, error, and data state management.
 * "use client" directive required for hooks.
 * 
 * NOTE: This hook runs the query once on mount by default.
 * Pass dependencies in deps array to refetch when they change.
 */

"use client";

import { useEffect, useState, useRef } from "react";

export function useOrgQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);

  // Always update the ref with the latest function
  fnRef.current = fn;

  const execute = async () => {
    setLoading(true);
    setError(null);

    const cancelled = false;

    try {
      const result = await fnRef.current();
      if (!cancelled && mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (e: unknown) {
      if (!cancelled && mountedRef.current) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setData(null);
      }
    } finally {
      if (!cancelled && mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
    // Only depend on the deps array and refetchKey, not the function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchKey]);

  // Expose refetch function
  const refetch = () => {
    setRefetchKey((prev) => prev + 1);
  };
  
  // Expose setData for optimistic updates
  const updateData = (updater: (prev: T | null) => T | null) => {
    setData(updater);
  };

  return { data, error, loading, refetch, updateData };
}
