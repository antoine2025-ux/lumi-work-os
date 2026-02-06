/**
 * Loopbrain Answer Envelope v0 — JSON Schema Validation
 *
 * Validates envelope against the authoritative output contract.
 * AJV config is part of the Loopbrain contract surface and must not be loosened.
 *
 * Validation failures = hard failure (caller decides; no auto-logging as warnings).
 */

import Ajv from "ajv";
import { readFileSync } from "fs";
import { join } from "path";

const SCHEMA_PATH = join(process.cwd(), "schema", "loopbrain-answer-envelope.v0.schema.json");

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
  });

  _validator = ajv.compile(schema);
  return _validator;
}

/**
 * Validate envelope against LoopbrainAnswerEnvelopeV0 JSON Schema.
 * No coercion, no defaulting, no auto-fixes.
 */
export function validateAnswerEnvelopeV0(envelope: unknown): {
  ok: boolean;
  errors: string[];
} {
  const validate = getValidator();
  const valid = validate(envelope);

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
