import type { AuditEntry } from "./auditLog";

export async function fetchAudit(): Promise<any[]> {
  const res = await fetch("/api/org/audit", { cache: "no-store" });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data?.ok) return [];
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries.map((e: any) => ({
    ...e,
    ts: e.createdAt ? new Date(e.createdAt).getTime() : Date.now(),
  }));
}

export async function writeAudit(entry: {
  action: string;
  targetCount: number;
  summary: string;
}): Promise<void> {
  await fetch("/api/org/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function fetchPermissions(): Promise<{ canEdit: boolean; role: string }> {
  const res = await fetch("/api/org/permissions", { cache: "no-store" });
  const data = await res.json().catch(() => ({} as any));
  
  // 401 means not authenticated - this should be handled by auth layer
  if (res.status === 401) {
    throw new Error("Unauthenticated");
  }
  
  // 403 means authenticated but no org membership - return read-only
  if (res.status === 403 || data?.noOrgMembership) {
    return { canEdit: false, role: "viewer" };
  }
  
  if (!res.ok || !data?.ok) {
    // Default to read-only on other errors
    return { canEdit: false, role: "viewer" };
  }
  
  return { canEdit: !!data.canEdit, role: data.role || "editor" };
}

