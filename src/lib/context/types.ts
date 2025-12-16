// BaseContextObject — the universal shape all context objects extend.
// Loopbrain relies on this consistent structure when reasoning.

export interface BaseContextObject {
  contextId: string;         // Unique ID for this context run
  workspaceId: string;       // Always required
  type: string;              // "workspace" | "org" | "department" | "team" | "person"
  title: string;             // Human-readable title shown in Loopbrain
  summary: string | null;    // Optional short description
  data: object;              // Context-specific payload
  capturedAt: string;        // ISO timestamp when snapshot was generated
}

