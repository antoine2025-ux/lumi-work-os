/**
 * ContextObject Runtime Validation
 * 
 * Validates ContextObjects against the Loopwell Org ContextObject Specification v2.1
 * before writing to the Context Store.
 */

import { ContextObject, ContextRelation, ContextStatus, ContextType } from "./contextTypes";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isContextStatus(value: unknown): value is ContextStatus {
  return value === "ACTIVE" || value === "INACTIVE" || value === "ARCHIVED";
}

const CONTEXT_TYPES: ContextType[] = [
  "person",
  "team",
  "department",
  "role",
  "org",
  "task",
  "project",
  "page",
  "note",
];

function isContextType(value: unknown): value is ContextType {
  return typeof value === "string" && CONTEXT_TYPES.includes(value as ContextType);
}

const VALID_ID_PREFIXES = [
  "org:",
  "person:",
  "team:",
  "department:",
  "role:",
  "project:",
  "task:",
  "page:",
  "note:",
];

/**
 * Validate that an ID follows the ContextObject ID format.
 * Must start with one of the valid prefixes.
 */
export function isValidContextIdFormat(id: string): boolean {
  return VALID_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Optional type-specific ID helpers for stricter validation.
 */
export function isPersonId(id: string): boolean {
  return id.startsWith("person:");
}

export function isTeamId(id: string): boolean {
  return id.startsWith("team:");
}

export function isDepartmentId(id: string): boolean {
  return id.startsWith("department:");
}

export function isRoleId(id: string): boolean {
  return id.startsWith("role:");
}

export function isOrgId(id: string): boolean {
  return id.startsWith("org:");
}

/**
 * Validate relations array, ensuring:
 * - Each relation's sourceId equals the parent ContextObject.id
 * - Each relation's targetId follows a valid ID format
 */
function validateRelations(
  relations: unknown,
  parentId: string
): ContextRelation[] {
  if (!Array.isArray(relations)) {
    throw new Error("relations must be an array");
  }

  return relations.map((rel, idx) => {
    if (!rel || typeof rel !== "object") {
      throw new Error(`relations[${idx}] must be an object`);
    }

    const { type, sourceId, targetId, label } = rel as Partial<ContextRelation>;

    if (!isNonEmptyString(type)) {
      throw new Error(`relations[${idx}].type must be a non-empty string`);
    }
    if (!isNonEmptyString(sourceId)) {
      throw new Error(`relations[${idx}].sourceId must be a non-empty string`);
    }
    if (!isNonEmptyString(targetId)) {
      throw new Error(`relations[${idx}].targetId must be a non-empty string`);
    }
    if (!isNonEmptyString(label)) {
      throw new Error(`relations[${idx}].label must be a non-empty string`);
    }

    // Enforce that sourceId equals the parent ContextObject.id
    if (sourceId !== parentId) {
      throw new Error(
        `relations[${idx}].sourceId (${sourceId}) must equal ContextObject.id (${parentId})`
      );
    }

    // Enforce that targetId follows a valid ID format
    if (!isValidContextIdFormat(targetId)) {
      throw new Error(
        `relations[${idx}].targetId (${targetId}) must start with a valid context prefix (${VALID_ID_PREFIXES.join(
          ", "
        )})`
      );
    }

    return {
      type,
      sourceId,
      targetId,
      label,
    };
  });
}

export function validateContextObject(raw: unknown): ContextObject {
  if (!raw || typeof raw !== "object") {
    throw new Error("ContextObject must be an object");
  }

  const obj = raw as Partial<ContextObject>;

  if (!isNonEmptyString(obj.id)) {
    throw new Error("ContextObject.id must be a non-empty string");
  }

  // Validate that the ID follows a valid format
  if (!isValidContextIdFormat(obj.id)) {
    throw new Error(
      `ContextObject.id (${obj.id}) must start with a valid context prefix (${VALID_ID_PREFIXES.join(
        ", "
      )})`
    );
  }

  if (!isContextType(obj.type)) {
    throw new Error(`ContextObject.type must be a valid ContextType, got: ${String(obj.type)}`);
  }

  if (!isNonEmptyString(obj.title)) {
    throw new Error("ContextObject.title must be a non-empty string");
  }

  if (!isNonEmptyString(obj.summary)) {
    throw new Error("ContextObject.summary must be a non-empty string");
  }

  if (!Array.isArray(obj.tags)) {
    throw new Error("ContextObject.tags must be an array of strings");
  }

  const tags = obj.tags.map((t, idx) => {
    if (!isNonEmptyString(t)) {
      throw new Error(`ContextObject.tags[${idx}] must be a non-empty string`);
    }
    return t.trim();
  });

  const relations = validateRelations(obj.relations ?? [], obj.id);

  if (obj.owner !== null && obj.owner !== undefined && !isNonEmptyString(obj.owner)) {
    throw new Error("ContextObject.owner must be null or a non-empty string");
  }

  if (!isContextStatus(obj.status)) {
    throw new Error(`ContextObject.status must be ACTIVE | INACTIVE | ARCHIVED, got: ${String(obj.status)}`);
  }

  if (!isNonEmptyString(obj.updatedAt)) {
    throw new Error("ContextObject.updatedAt must be a non-empty ISO8601 string");
  }

  return {
    id: obj.id,
    type: obj.type,
    title: obj.title,
    summary: obj.summary,
    tags,
    relations,
    owner: obj.owner ?? null,
    status: obj.status,
    updatedAt: obj.updatedAt,
  };
}

