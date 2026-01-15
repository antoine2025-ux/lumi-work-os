#!/usr/bin/env node
/**
 * Org Loopbrain Contract Test (v2)
 * 
 * Validates that GET /api/org/loopbrain/context returns a valid v2 payload
 * when v2 is requested via header or query param.
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

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ Contract test failed: ${msg}`);
    process.exit(1);
  }
}

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

async function req(baseUrl, path, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(baseUrl + path);
    const client = urlObj.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
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
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  console.log("Testing Loopbrain Org context contract (v2)...");
  console.log(`Base URL: ${BASE_URL}`);

  const baseUrl = BASE_URL;
  const headers = { "X-Loopbrain-Context-Version": "v2" };

  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  if (AUTH_COOKIE) {
    headers["Cookie"] = AUTH_COOKIE;
  }

  if (!AUTH_COOKIE && !AUTH_TOKEN) {
    console.warn("⚠ Warning: No auth credentials provided (LOOPWELL_COOKIE or LOOPWELL_BEARER_TOKEN)");
    console.warn("  Request may fail with 401. Set env vars to test authenticated endpoint.");
  }

  try {
    // Test v2 via query param
    const ctxQuery = await req(baseUrl, "/api/org/loopbrain/context?version=v2", headers);
    assert(ctxQuery.ok, `Context v2 endpoint (query) failed: ${ctxQuery.status}`);
    assert(isObj(ctxQuery.body), "Context v2 response (query) must be JSON object");
    assert(isObj(ctxQuery.body.context), "Context v2 (query) must include context object");
    assert(ctxQuery.body.context.version === "v2", "context.version (query) must be v2");
    assert(typeof ctxQuery.body.context.generatedAt === "string", "generatedAt (query) must be string");

    // Test v2 via header (no query param)
    const ctxHeader = await req(baseUrl, "/api/org/loopbrain/context", headers);
    assert(ctxHeader.ok, `Context v2 endpoint (header) failed: ${ctxHeader.status}`);
    assert(isObj(ctxHeader.body), "Context v2 response (header) must be JSON object");
    assert(isObj(ctxHeader.body.context), "Context v2 (header) must include context object");
    assert(ctxHeader.body.context.version === "v2", "context.version (header) must be v2");
    assert(typeof ctxHeader.body.context.generatedAt === "string", "generatedAt (header) must be string");

    console.log("✅ Contract test passed: LoopbrainOrgContext v2 payload is valid (query and header negotiation)");
  } catch (error) {
    console.error("❌ Contract test error:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("  Connection refused. Is the server running?");
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("❌ Org Loopbrain v2 contract test crashed:", e);
  process.exit(1);
});

