export type AuditAction =
  | "update_manager"
  | "update_team"
  | "bulk_update_manager"
  | "bulk_update_team";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  ts: number;
  actor: "you"; // placeholder for real auth user later
  targetCount: number;
  summary: string;
};

const LS_KEY = "loopwell_org_people_audit_log_v1";

function safeParse(json: string | null): AuditEntry[] {
  if (!json) return [];

  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(Boolean);
  } catch {
    return [];
  }
}

export function loadAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.sessionStorage.getItem(LS_KEY));
}

export function saveAudit(entries: AuditEntry[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LS_KEY, JSON.stringify(entries));
}

export function pushAudit(entry: Omit<AuditEntry, "id" | "ts">): AuditEntry {
  return {
    id: `aud_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    ...entry,
  };
}

