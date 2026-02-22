"use client";

export async function saveOrgPreferences(prefs: Record<string, unknown>) {
  try {
    await fetch("/api/org/preferences/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    });
  } catch {
    // best effort
  }
}

export async function loadOrgPreferences(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch("/api/org/preferences/get", { cache: "no-store" });
    const data = await res.json();
    return (data.preferences ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

