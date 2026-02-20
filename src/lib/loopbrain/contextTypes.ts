/**
 * Re-export ContextObject types from canonical source.
 * Loopbrain uses the same ContextObject shape as the generic context module.
 * This file exists for backward compatibility with existing imports.
 */
export type {
  ContextObject,
  ContextType,
  ContextRelation,
  ContextStatus,
} from '@/lib/context/contextTypes'

export type ContextRelationType =
  | "reports_to"
  | "manages"
  | "member_of_team"
  | "member_of_department"
  | "has_person"
  | "has_team"
  | "has_department"
  | "has_role"
  | "responsible_for"
  | "owns"
