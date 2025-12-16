"use client";

let pending = false;

export async function trackOrgEvent(input: {
  type: string;
  category?: string;
  name?: string;
  route?: string;
  meta?: Record<string, unknown>;
}) {
  if (pending) return; // tiny guard to avoid spam bursts
  pending = true;

  try {
    await fetch("/api/org/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // best-effort; ignore errors
  } finally {
    pending = false;
  }
}

