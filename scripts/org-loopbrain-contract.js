#!/usr/bin/env node
/**
 * Org Loopbrain Contract Test
 * 
 * Validates that GET /api/org/loopbrain/context returns a valid v1 payload
 * that matches the contract specification.
 * 
 * Requires:
 * - LOOPWELL_BASE_URL (defaults to http://localhost:3000)
 * - LOOPWELL_COOKIE or LOOPWELL_BEARER_TOKEN (for auth)
 */

const http = require("http");
const https = require("https");

const BASE_URL = process.env.LOOPWELL_BASE_URL || "http://localhost:3000";
const AUTH_COOKIE = process.env.LOOPWELL_COOKIE;
const AUTH_TOKEN = process.env.LOOPWELL_BEARER_TOKEN;

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ Contract test failed: ${msg}`);
    process.exit(1);
  }
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: {
        ...(options.headers || {}),
        ...(AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {}),
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    };

    const req = client.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function main() {
  console.log("Testing Loopbrain Org context contract (v1)...");
  console.log(`Base URL: ${BASE_URL}`);

  if (!AUTH_COOKIE && !AUTH_TOKEN) {
    console.warn("⚠ Warning: No auth credentials provided (LOOPWELL_COOKIE or LOOPWELL_BEARER_TOKEN)");
    console.warn("  Request may fail with 401. Set env vars to test authenticated endpoint.");
  }

  try {
    const res = await fetch(`${BASE_URL}/api/org/loopbrain/context`);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body !== null, "Response body is null");
    assert(typeof res.body === "object", "Response body must be JSON object");
    assert("context" in res.body, "Response must have 'context' field");

    const c = res.body.context;

    // Root fields
    assert(typeof c.generatedAt === "string", "context.generatedAt must be string");
    assert(c.version === "v1", `context.version must be 'v1', got '${c.version}'`);

    // readiness
    assert(typeof c.readiness === "object", "context.readiness must be object");
    assert(typeof c.readiness.ready === "boolean", "context.readiness.ready must be boolean");
    assert(Array.isArray(c.readiness.items), "context.readiness.items must be array");

    // Check required readiness item keys
    const requiredKeys = new Set([
      "people_added",
      "structure_defined",
      "ownership_assigned",
      "reporting_defined",
      "availability_set",
    ]);
    const keys = new Set(c.readiness.items.map((i) => i.key));
    for (const k of requiredKeys) {
      assert(keys.has(k), `Missing readiness item key: ${k}`);
    }

    // Validate readiness items structure
    for (const item of c.readiness.items) {
      assert(typeof item === "object", "readiness.items[] must be object");
      assert(typeof item.key === "string", "readiness.items[].key must be string");
      assert(typeof item.complete === "boolean", "readiness.items[].complete must be boolean");
      assert(typeof item.meta === "object", "readiness.items[].meta must be object");
    }

    // orgCounts
    assert(typeof c.orgCounts === "object", "context.orgCounts must be object");
    const countFields = [
      "people",
      "teams",
      "departments",
      "unownedEntities",
      "missingManagers",
      "availabilityUnknown",
      "availabilityStale",
    ];
    for (const k of countFields) {
      assert(
        typeof c.orgCounts[k] === "number" && Number.isFinite(c.orgCounts[k]),
        `context.orgCounts.${k} must be number`
      );
      assert(c.orgCounts[k] >= 0, `context.orgCounts.${k} must be >= 0`);
    }

    // intelligence
    assert(typeof c.intelligence === "object", "context.intelligence must be object");
    assert("snapshot" in c.intelligence, "context.intelligence.snapshot must exist");
    assert("rollups" in c.intelligence, "context.intelligence.rollups must exist");
    assert(Array.isArray(c.intelligence.topFindings), "context.intelligence.topFindings must be array");

    // recommendations
    assert(typeof c.recommendations === "object", "context.recommendations must be object");
    assert("snapshot" in c.recommendations, "context.recommendations.snapshot must exist");
    assert(Array.isArray(c.recommendations.topActions), "context.recommendations.topActions must be array");

    // Invariants
    if (c.orgCounts.people === 0) {
      assert(
        c.readiness.ready === false,
        "Invariant: If orgCounts.people == 0, readiness.ready must be false"
      );
    }
    assert(
      c.orgCounts.missingManagers <= c.orgCounts.people,
      `Invariant: missingManagers (${c.orgCounts.missingManagers}) must be <= people (${c.orgCounts.people})`
    );

    console.log("✅ Contract test passed: LoopbrainOrgContext v1 payload is valid");
  } catch (error) {
    console.error("❌ Contract test error:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("  Connection refused. Is the server running?");
    }
    process.exit(1);
  }
}

main();

