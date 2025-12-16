/**
 * Event System Initialization
 * 
 * This module initializes all event listeners when imported.
 * Import this at the top level of your app/server to ensure listeners are registered.
 */

import { initializeOrgContextListeners } from "@/lib/loopbrain/listeners/orgContextListeners";

let initialized = false;

/**
 * Initialize all event listeners.
 * Safe to call multiple times (idempotent).
 */
export function initializeEventListeners(): void {
  if (initialized) {
    return;
  }

  // Initialize org context listeners
  initializeOrgContextListeners();

  initialized = true;
}

// Auto-initialize on import (for Next.js API routes)
if (typeof window === "undefined") {
  // Only run on server-side
  initializeEventListeners();
}

