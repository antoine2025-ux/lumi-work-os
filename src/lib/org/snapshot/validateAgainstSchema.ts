/**
 * Org Semantic Snapshot v0 — JSON Schema Validation
 *
 * Validates snapshot against the authoritative Loopbrain ingest contract.
 * AJV config is part of the Loopbrain contract surface and must not be loosened.
 *
 * Validation precedence: If schema validation fails, validateSnapshotV0 result
 * MUST be ignored; snapshot is invalid for Loopbrain ingestion.
 */

import Ajv from "ajv";
import { readFileSync } from "fs";
import { join } from "path";

// Load schema from project root
const SCHEMA_PATH = join(process.cwd(), "schema", "org-semantic-snapshot.v0.schema.json");

let _validator: ReturnType<Ajv["compile"]> | null = null;

function getValidator(): ReturnType<Ajv["compile"]> {
  if (_validator) return _validator;

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));

  // AJV config is part of the Loopbrain contract surface and must not be loosened.
  const ajv = new Ajv({
    strict: true,
    allErrors: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
    // No loadSchema = no remote $ref resolution (local refs only)
  });

  _validator = ajv.compile(schema);
  return _validator;
}

/**
 * Validate snapshot against the OrgSemanticSnapshotV0 JSON Schema.
 * No coercion, no defaulting, no auto-fixes.
 */
export function validateSnapshotAgainstSchema(snapshot: unknown): {
  ok: boolean;
  errors: string[];
} {
  const validate = getValidator();
  const valid = validate(snapshot);

  if (valid) {
    return { ok: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((err) => {
    const path = err.instancePath
      ? err.instancePath.replace(/^\//, "").replace(/\//g, ".")
      : "(root)";
    const msg = err.message ?? "validation failed";
    return `${path}: ${msg}`;
  });

  return { ok: false, errors };
}
