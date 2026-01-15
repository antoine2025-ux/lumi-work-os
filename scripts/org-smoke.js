/**
 * Org API Smoke Test Script
 * 
 * Tests core Org API endpoints to ensure they are working correctly.
 * Requires authentication via environment variables.
 * 
 * Environment variables:
 * - LOOPWELL_BASE_URL: Base URL of the app (e.g., http://localhost:3000)
 * - LOOPWELL_BEARER_TOKEN: Optional bearer token for auth
 * - LOOPWELL_COOKIE: Optional cookie string for session-based auth
 */

async function req(baseUrl, path, headers) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const baseUrl = mustEnv("LOOPWELL_BASE_URL"); // e.g. http://localhost:3000
  const headers = { "Content-Type": "application/json" };

  // Auth options:
  // - Bearer token header (if supported)
  // - Cookie header (if session-based)
  if (process.env.LOOPWELL_BEARER_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.LOOPWELL_BEARER_TOKEN}`;
  }
  if (process.env.LOOPWELL_COOKIE) {
    headers["Cookie"] = process.env.LOOPWELL_COOKIE;
  }

  const endpoints = [
    "/api/org/flags",
    "/api/org/people",
    "/api/org/structure",
    "/api/org/ownership",
  ];

  for (const ep of endpoints) {
    const r = await req(baseUrl, ep, headers);
    if (!r.ok) {
      console.error(`FAIL ${ep}: ${r.status}`);
      console.error(r.body);
      process.exit(1);
    }
    console.log(`OK ${ep}: ${r.status}`);
  }

  const people = await req(baseUrl, "/api/org/people", headers);
  const firstId = people.body?.people?.[0]?.id;
  if (firstId) {
    const detail = await req(baseUrl, `/api/org/people/${firstId}`, headers);
    if (!detail.ok) {
      console.error(`FAIL /api/org/people/${firstId}: ${detail.status}`);
      console.error(detail.body);
      process.exit(1);
    }
    console.log(`OK /api/org/people/${firstId}: ${detail.status}`);
  } else {
    console.log("No people found; skipping person detail check.");
  }

  console.log("Org smoke test passed.");
}

main().catch((e) => {
  console.error("Org smoke test crashed:", e);
  process.exit(1);
});

