/**
 * Org Onboarding Flow Script
 * 
 * Programmatically tests the Org MVP onboarding flow to catch regressions.
 * Validates the complete happy path: create people, set manager, create team, assign owner, set availability.
 * 
 * Environment variables:
 * - LOOPWELL_BASE_URL: Base URL of the app (e.g., http://localhost:3000)
 * - LOOPWELL_BEARER_TOKEN: Optional bearer token for auth
 * - LOOPWELL_COOKIE: Optional cookie string for session-based auth (recommended)
 */

async function req(baseUrl, path, headers, method = "GET", body = undefined) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

function pickId(obj, candidates) {
  for (const c of candidates) {
    const v = obj?.[c];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

async function main() {
  const baseUrl = mustEnv("LOOPWELL_BASE_URL");
  const headers = { "Content-Type": "application/json" };

  if (process.env.LOOPWELL_BEARER_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.LOOPWELL_BEARER_TOKEN}`;
  }
  if (process.env.LOOPWELL_COOKIE) {
    headers["Cookie"] = process.env.LOOPWELL_COOKIE;
  }

  console.log("Starting Org onboarding flow…");

  // 1) Create person A
  const personAEmail = `flow+a_${Date.now()}@example.com`;
  console.log(`Creating person A: ${personAEmail}`);
  const createA = await req(baseUrl, "/api/org/people/create", headers, "POST", {
    fullName: "Flow Person A",
    email: personAEmail,
  });
  assert(createA.ok, `Create person A failed (${createA.status}): ${JSON.stringify(createA.json)}`);
  const personAId = pickId(createA.json, ["id"]);
  assert(personAId, `Could not extract person A id from response: ${JSON.stringify(createA.json)}`);
  console.log(`  ✓ Person A created: ${personAId}`);

  // 2) Create person B
  const personBEmail = `flow+b_${Date.now()}@example.com`;
  console.log(`Creating person B: ${personBEmail}`);
  const createB = await req(baseUrl, "/api/org/people/create", headers, "POST", {
    fullName: "Flow Person B",
    email: personBEmail,
  });
  assert(createB.ok, `Create person B failed (${createB.status}): ${JSON.stringify(createB.json)}`);
  const personBId = pickId(createB.json, ["id"]);
  assert(personBId, `Could not extract person B id from response: ${JSON.stringify(createB.json)}`);
  console.log(`  ✓ Person B created: ${personBId}`);

  // 3) Set manager for B → A
  console.log(`Setting manager: ${personBId} → ${personAId}`);
  const setMgr = await req(baseUrl, `/api/org/people/${personBId}/manager`, headers, "PUT", {
    managerId: personAId,
  });
  assert(setMgr.ok, `Set manager failed (${setMgr.status}): ${JSON.stringify(setMgr.json)}`);
  console.log(`  ✓ Manager set`);

  // 4) Create a department (required before creating team)
  const deptName = `Flow Dept ${Date.now()}`;
  console.log(`Creating department: ${deptName}`);
  const createDept = await req(baseUrl, "/api/org/structure/departments/create", headers, "POST", {
    name: deptName,
  });
  assert(createDept.ok, `Create department failed (${createDept.status}): ${JSON.stringify(createDept.json)}`);
  const deptId = pickId(createDept.json, ["id"]) || pickId(createDept.json?.department, ["id"]);
  assert(deptId, `Could not extract department id from response: ${JSON.stringify(createDept.json)}`);
  console.log(`  ✓ Department created: ${deptId}`);

  // 5) Create a team (requires departmentId)
  const teamName = `Flow Team ${Date.now()}`;
  console.log(`Creating team: ${teamName}`);
  const createTeam = await req(baseUrl, "/api/org/structure/teams/create", headers, "POST", {
    name: teamName,
    departmentId: deptId,
  });
  assert(createTeam.ok, `Create team failed (${createTeam.status}): ${JSON.stringify(createTeam.json)}`);
  const teamId = pickId(createTeam.json, ["id"]) || pickId(createTeam.json?.team, ["id"]);
  assert(teamId, `Could not extract team id from response: ${JSON.stringify(createTeam.json)}`);
  console.log(`  ✓ Team created: ${teamId}`);

  // 6) Assign team owner
  console.log(`Setting team owner: ${teamId} → ${personAId}`);
  const setOwner = await req(
    baseUrl,
    `/api/org/structure/teams/${encodeURIComponent(teamId)}/owner`,
    headers,
    "PUT",
    {
      ownerPersonId: personAId,
    }
  );
  assert(setOwner.ok, `Set team owner failed (${setOwner.status}): ${JSON.stringify(setOwner.json)}`);
  console.log(`  ✓ Team owner set`);

  // 7) Add member (B) to team
  console.log(`Adding team member: ${personBId} to ${teamId}`);
  const addMember = await req(
    baseUrl,
    `/api/org/structure/teams/${encodeURIComponent(teamId)}/members/add`,
    headers,
    "POST",
    {
      personId: personBId,
    }
  );
  assert(addMember.ok, `Add team member failed (${addMember.status}): ${JSON.stringify(addMember.json)}`);
  console.log(`  ✓ Team member added`);

  // 8) Set availability for A and B
  console.log(`Setting availability for person A`);
  const availA = await req(baseUrl, `/api/org/people/${personAId}/availability`, headers, "PUT", {
    status: "AVAILABLE",
  });
  assert(availA.ok, `Set availability A failed (${availA.status}): ${JSON.stringify(availA.json)}`);
  console.log(`  ✓ Availability A set`);

  console.log(`Setting availability for person B`);
  const availB = await req(baseUrl, `/api/org/people/${personBId}/availability`, headers, "PUT", {
    status: "PARTIALLY_AVAILABLE",
  });
  assert(availB.ok, `Set availability B failed (${availB.status}): ${JSON.stringify(availB.json)}`);
  console.log(`  ✓ Availability B set`);

  // 9) Verify read endpoints reflect state
  console.log("Verifying read endpoints…");
  const people = await req(baseUrl, "/api/org/people", headers);
  assert(people.ok, `GET /api/org/people failed (${people.status}): ${JSON.stringify(people.json)}`);
  console.log(`  ✓ People endpoint: ${people.json?.people?.length || 0} people`);

  const structure = await req(baseUrl, "/api/org/structure", headers);
  assert(structure.ok, `GET /api/org/structure failed (${structure.status}): ${JSON.stringify(structure.json)}`);
  console.log(`  ✓ Structure endpoint: ${structure.json?.teams?.length || 0} teams`);

  const ownership = await req(baseUrl, "/api/org/ownership", headers);
  assert(ownership.ok, `GET /api/org/ownership failed (${ownership.status}): ${JSON.stringify(ownership.json)}`);
  console.log(`  ✓ Ownership endpoint: ${ownership.json?.coverage?.teams?.total || 0} teams`);

  const overview = await req(baseUrl, "/api/org/overview", headers);
  assert(overview.ok, `GET /api/org/overview failed (${overview.status}): ${JSON.stringify(overview.json)}`);
  console.log(`  ✓ Overview endpoint: ${overview.json?.summary?.peopleCount || 0} people`);

  console.log("\n✅ Org onboarding flow passed.");
  console.log(`Created persons: ${personAId}, ${personBId}`);
  console.log(`Created department: ${deptId}`);
  console.log(`Created team: ${teamId}`);
}

main().catch((e) => {
  console.error("Org onboarding flow crashed:", e);
  process.exit(1);
});

