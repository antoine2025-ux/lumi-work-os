/**
 * Unified ContextObject Type System
 * 
 * This file defines the generic, cross-module ContextObject primitive that all entities
 * (projects, pages, tasks, roles, etc.) use to expose structured context to Loopbrain.
 * 
 * Note: This is separate from src/lib/loopbrain/context-types.ts, which defines
 * Loopbrain-specific context views (WorkspaceContext, ProjectContext, etc.) that may
 * internally use ContextObject in later phases.
 * 
 * The ContextObject is a unified, reusable structure that provides:
 * - Canonical entity representation
 * - Graph-style relations between entities
 * - Consistent metadata and tagging
 */

/**
 * All supported context object types
 */
export type ContextObjectType =
  | 'project'
  | 'page'
  | 'task'
  | 'role'
  | 'person'
  | 'meeting'
  | 'workspace'
  | 'team'

/**
 * A relation between two ContextObjects
 */
export interface ContextRelation {
  /** The type of the related entity */
  type: ContextObjectType
  /** The ID of the related entity */
  id: string
  /** Human-readable label describing the relationship (e.g., "owner", "assignee", "parent project") */
  label?: string
  /** Direction of the relation: 'in' (incoming), 'out' (outgoing), or 'both' */
  direction?: 'in' | 'out' | 'both'
  /** Additional metadata about the relation */
  metadata?: Record<string, unknown>
}

/**
 * Unified ContextObject - the canonical representation of any entity
 * 
 * All entities (projects, tasks, pages, roles, etc.) can be converted to this
 * unified structure to provide consistent context to Loopbrain.
 */
export interface ContextObject {
  /** Unique identifier of the entity */
  id: string
  /** Type of the entity */
  type: ContextObjectType
  /** Human-readable title/name of the entity */
  title: string
  /** Short, human-readable summary built from key fields */
  summary: string
  /** Array of tags/keywords for categorization and search */
  tags: string[]
  /** ID of the primary owner/responsible person (if applicable) */
  ownerId?: string
  /** Normalized status string (e.g., 'active', 'completed', 'blocked', 'draft', 'archived') */
  status?: string
  /** Timestamp of last update (prefer updatedAt, fallback to createdAt) */
  updatedAt: Date
  /** Array of relations to other ContextObjects */
  relations: ContextRelation[]
  /** Additional entity-specific metadata (non-critical fields) */
  metadata?: Record<string, unknown>
}





