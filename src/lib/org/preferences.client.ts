"use client";

export async function saveOrgPreferences(prefs: Record<string, any>) {
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

export async function loadOrgPreferences(): Promise<Record<string, any>> {
  try {
    const res = await fetch("/api/org/preferences/get", { cache: "no-store" });
    const data = await res.json();
    return (data.preferences ?? {}) as Record<string, any>;
  } catch {
    return {};
  }
}

