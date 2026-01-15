// src/types/loopbrain-org-debug.ts

/**
 * Lightweight debug snapshot for Org-mode routing decisions.
 * Used only in development to inspect how questions are routed.
 */
export type OrgDebugSnapshot = {
  question: string;
  mode: "org" | "generic";
  wantsOrg: boolean;
  hasOrgContext: boolean;
  workspaceId?: string | null;
  timestamp: string; // ISO
  orgContextPreview?: string | null;
  orgContextLength?: number;
  error?: string | null;
};

