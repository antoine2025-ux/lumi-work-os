import { z } from 'zod'
import {
  nonEmptyString,
  emailString,
  dateString,
  optionalDateString,
} from './common'

// ============================================================================
// TIER 1 – People & Membership schemas
// ============================================================================

// --- People ---

/** POST /api/org/people/create */
export const OrgPersonCreateSchema = z.object({
  fullName: nonEmptyString.max(255),
  email: z.string().trim().email().optional(),
  title: z.string().optional(),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  managerId: z.string().optional(),
  jobDescriptionId: z.string().optional(),
  startDate: z.string().optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  autoCreateRoleCard: z.boolean().optional().default(true),
})

/** PUT /api/org/people/[personId]/update */
export const OrgPersonUpdateSchema = z.object({
  fullName: nonEmptyString.max(255),
  email: z.string().trim().email().optional(),
  title: z.string().optional(),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  managerId: z.string().optional(),
})

/** POST /api/org/people/update (legacy patch by id) */
export const OrgPersonPatchSchema = z.object({
  id: nonEmptyString,
  patch: z.object({
    managerId: z.string().nullable().optional(),
    managerName: z.string().nullable().optional(),
    teamName: z.string().nullable().optional(),
  }),
})

/** POST /api/org/people/manager – bulk set manager */
export const OrgBulkManagerSchema = z.object({
  personIds: z.array(z.string()).min(1, 'personIds must be a non-empty array'),
  managerId: z.string().nullable(),
})

/** POST /api/org/people/manager/edge – single edge update */
export const OrgManagerEdgeSchema = z.object({
  personId: nonEmptyString,
  newManagerId: z.string().nullable().optional(),
})

/** POST /api/org/people/bulk – bulk patch */
export const OrgBulkPatchSchema = z.object({
  personIds: z.array(z.string()).min(1, 'personIds must be a non-empty array'),
  patch: z
    .object({
      managerId: z.string().nullable().optional(),
      teamName: z.string().nullable().optional(),
      roleName: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: 'patch must contain at least one field',
    }),
})

/** PUT /api/org/people/[personId]/team */
export const OrgPersonTeamSchema = z.object({
  teamId: z.string().nullable(),
})

/** PUT /api/org/people/[personId]/manager */
export const OrgPersonManagerSchema = z.object({
  managerId: z.string().nullable().optional(),
})

/** PUT /api/org/people/[personId]/title */
export const OrgPersonTitleUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Title must be at least 1 character').max(100),
})

// --- Members ---

/** POST /api/org/members */
export const OrgMemberCreateSchema = z.object({
  userId: nonEmptyString,
  role: nonEmptyString,
})

/** POST /server/api/org/members/remove */
export const OrgMemberRemoveSchema = z.object({
  workspaceId: nonEmptyString,
  membershipId: nonEmptyString,
})

/** POST /server/api/org/members/updateRole */
export const OrgMemberUpdateRoleSchema = z.object({
  workspaceId: nonEmptyString,
  membershipId: nonEmptyString,
  role: z.enum(['ADMIN', 'MEMBER']),
})

/** POST /server/api/org/members/leave */
export const OrgMemberLeaveSchema = z.object({
  workspaceId: nonEmptyString,
})

// ============================================================================
// TIER 2 – Org Structure & Capacity schemas
// ============================================================================

// --- Teams ---

/** POST /api/org/teams */
export const OrgTeamCreateSchema = z.object({
  name: nonEmptyString.max(255),
  departmentId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

// --- Positions ---

/** POST /api/org/positions */
export const OrgPositionCreateSchema = z.object({
  title: nonEmptyString.max(255),
  teamId: nonEmptyString,
  level: z.number().int().min(1).max(10).optional(),
})

// --- Departments ---

/** POST /api/org/departments */
export const OrgDepartmentCreateSchema = z.object({
  name: nonEmptyString.max(255),
  description: z.string().nullable().optional(),
})

/** PUT /api/org/departments/[id] */
export const OrgDepartmentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().optional(),
  ownerPersonId: z.string().nullable().optional(),
})

// --- Capacity ---

/** POST /api/org/capacity/contract */
export const CapacityContractCreateSchema = z
  .object({
    personId: nonEmptyString,
    weeklyCapacityHours: z.number().min(0).max(168),
    effectiveFrom: dateString,
    effectiveTo: optionalDateString,
  })
  .refine(
    (d) => {
      if (d.effectiveTo) {
        return new Date(d.effectiveTo) > new Date(d.effectiveFrom)
      }
      return true
    },
    { message: 'effectiveTo must be after effectiveFrom', path: ['effectiveTo'] }
  )

/** POST /api/org/allocations */
export const AllocationCreateSchema = z
  .object({
    personId: nonEmptyString,
    allocationPercent: z.number().min(0).max(1),
    contextType: z.enum(['TEAM', 'PROJECT', 'ROLE', 'OTHER']),
    contextId: z.string().optional(),
    contextLabel: z.string().optional(),
    startDate: dateString,
    endDate: optionalDateString,
    source: z.enum(['MANUAL', 'INTEGRATION']).optional(),
  })
  .refine(
    (d) => {
      if (d.endDate) {
        return new Date(d.endDate) > new Date(d.startDate)
      }
      return true
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  )

// --- Invitations ---

/** POST /api/org/invitations */
export const OrgInvitationSchema = z.object({
  email: emailString,
  role: z.enum(['VIEWER', 'EDITOR', 'ADMIN']),
})

// --- Skills ---

/** POST /api/org/skills */
export const OrgSkillCreateSchema = z.object({
  name: nonEmptyString,
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

// --- Role Cards (templates linking to OrgPosition) ---

/** POST /api/org/role-templates */
export const RoleCardCreateSchema = z.object({
  roleName: z.string().trim().min(1).max(100),
  jobFamily: z.string().trim().min(1).max(100),
  level: z.string().trim().min(1).max(50),
  roleDescription: z.string().trim().min(1),
  responsibilities: z.array(z.string().trim()).default([]),
  requiredSkills: z.array(z.string().trim()).default([]),
  preferredSkills: z.array(z.string().trim()).default([]),
  keyMetrics: z.array(z.string().trim()).default([]),
  positionId: z.string().optional(),
  // Manager-authored context fields (Phase 2)
  roleInOrg: z.string().trim().max(500).optional(),
  focusArea: z.string().trim().max(1000).optional(),
  managerNotes: z.string().trim().max(2000).optional(),
})

/** PUT /api/org/role-templates/[id] */
export const RoleCardUpdateSchema = RoleCardCreateSchema.partial()

// --- Roles ---

/** POST /api/org/roles */
export const OrgRoleCreateSchema = z.object({
  name: nonEmptyString,
  description: z.string().trim().optional(),
  responsibilities: z
    .array(
      z.object({
        scope: z.string().optional(),
        target: z.string().trim().min(1),
      })
    )
    .optional(),
})

// --- Decision Domains ---

/** POST /api/org/decision/domains */
export const DecisionDomainCreateSchema = z.object({
  key: nonEmptyString,
  name: nonEmptyString,
  description: z.string().trim().optional(),
  scope: z.enum(['TEAM', 'DEPARTMENT', 'FUNCTION', 'WORKSPACE']).optional(),
})

// --- Custom Roles ---

/** POST /api/org/custom-roles */
export const OrgCustomRoleCreateSchema = z.object({
  key: nonEmptyString,
  name: nonEmptyString,
  description: z.string().trim().optional(),
  capabilities: z.array(z.string()).optional(),
})

// ============================================================================
// TIER 3 – People Detail & Capacity schemas
// ============================================================================

// --- People Detail Updates ---

/** PUT /api/org/people/[personId]/name */
export const UpdatePersonNameSchema = z.object({
  name: nonEmptyString.max(255),
})

/** PUT /api/org/people/[personId]/availability */
export const UpdatePersonAvailabilitySchema = z.object({
  status: z.enum(['UNKNOWN', 'AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE']),
})

/** POST /api/org/people/update-profile */
export const UpdatePersonProfileSchema = z.object({
  id: nonEmptyString,
  name: z.string().trim().max(255).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  availability: z.object({
    status: z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE']),
    reason: z.string().trim().max(500).nullable().optional(),
  }).optional(),
  skills: z.array(z.string().trim()).max(50).optional(),
  roles: z.array(z.object({
    role: z.string().trim().min(1).max(100),
    percent: z.number().min(0).max(200),
  })).max(20).optional(),
})

/** POST /api/org/people/roles */
export const GetPersonRolesSchema = z.object({
  personContextId: nonEmptyString,
})

/** POST /api/org/people/[personId]/skills */
export const AddPersonSkillSchema = z.object({
  skillId: z.string().uuid(),
  proficiency: z.number().int().min(1).max(5).optional().default(3),
  source: z.enum(['SELF_REPORTED', 'MANAGER_ADDED', 'VERIFIED', 'INFERRED']).optional().default('SELF_REPORTED'),
})

/** PATCH /api/org/people/[personId]/skills/[personSkillId] */
export const UpdatePersonSkillSchema = z.object({
  proficiency: z.number().int().min(1).max(5).optional(),
  source: z.enum(['SELF_REPORTED', 'MANAGER_ADDED', 'VERIFIED', 'INFERRED']).optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
})

// --- Availability Windows ---

/** POST /api/org/people/[personId]/availability-windows */
export const CreateAvailabilityWindowSchema = z
  .object({
    type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'PARTIAL']),
    startDate: dateString,
    endDate: optionalDateString,
    fraction: z.number().min(0).max(1).optional(),
    reason: z.enum(['VACATION', 'SICK_LEAVE', 'PARENTAL_LEAVE', 'SABBATICAL', 'JURY_DUTY', 'BEREAVEMENT', 'TRAINING', 'OTHER']).optional(),
    expectedReturnDate: optionalDateString,
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (d) => {
      if (d.endDate) {
        return new Date(d.endDate) > new Date(d.startDate)
      }
      return true
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  )
  .refine(
    (d) => {
      if (d.type === 'PARTIAL' && d.fraction === undefined) {
        return false
      }
      return true
    },
    { message: 'fraction is required when type is PARTIAL', path: ['fraction'] }
  )

/** PATCH /api/org/people/[personId]/availability-windows/[windowId] */
export const UpdateAvailabilityWindowSchema = CreateAvailabilityWindowSchema.partial()

/** PATCH /api/org/people/[personId]/employment */
export const UpdatePersonEmploymentSchema = z.object({
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'CONTRACTOR']).optional(),
  employmentStartDate: z.string().datetime().nullable().optional(),
  employmentEndDate: z.string().datetime().nullable().optional(),
})

// --- Capacity Contracts ---

/** PUT /api/org/capacity/contract/[contractId] */
export const UpdateCapacityContractSchema = z.object({
  weeklyCapacityHours: z.number().min(0).max(168).optional(),
  effectiveFrom: dateString.optional(),
  effectiveTo: optionalDateString.optional(),
})

// --- Capacity Quick Entry ---

/** PATCH /api/org/capacity/people/[personId] */
export const CapacityQuickEntrySchema = z.object({
  weeklyHours: z.number().min(0).max(168).optional(),
  availabilityPct: z.number().min(0).max(1).optional(),
  allocationPct: z.number().min(0).max(2).optional(),
})

/** PATCH /api/org/capacity/teams/[teamId] */
export const TeamCapacityUpdateSchema = z.object({
  weeklyDemandHours: z.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional(),
})

// --- Allocations ---

/** PUT /api/org/allocations/[allocationId] */
export const UpdateAllocationSchema = z.object({
  allocationPercent: z.number().min(0).max(1).optional(),
  contextType: z.enum(['TEAM', 'PROJECT', 'ROLE', 'OTHER']).optional(),
  contextId: z.string().nullable().optional(),
  contextLabel: z.string().trim().max(200).nullable().optional(),
  startDate: dateString.optional(),
  endDate: optionalDateString.optional(),
  source: z.enum(['MANUAL', 'INTEGRATION']).optional(),
})

// ============================================================================
// TIER 4 – Structure, Intelligence, Work schemas
// ============================================================================

// --- Structure: Departments & Teams ---

/** POST /api/org/structure/departments/create */
export const CreateDepartmentSchema = z.object({
  name: nonEmptyString.max(255),
  ownerPersonId: z.string().nullable().optional(),
})

/** PUT /api/org/structure/departments/[departmentId] */
export const UpdateDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  ownerPersonId: z.string().nullable().optional(),
  color: z.string().trim().max(50).nullable().optional(),
})

/** POST /api/org/structure/teams/create */
export const CreateTeamSchema = z.object({
  name: nonEmptyString.max(255),
  departmentId: z.string().nullable().optional(),
})

/** PUT /api/org/structure/teams/[teamId] */
export const UpdateTeamSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  departmentId: z.string().nullable().optional(),
  leaderId: z.string().nullable().optional(),
  color: z.string().trim().max(50).nullable().optional(),
})

// --- Management & Coverage ---

/** POST /api/org/management/link */
export const CreateManagerLinkSchema = z.object({
  personId: nonEmptyString,
  managerId: nonEmptyString,
})

/** POST /api/org/coverage */
export const CreateRoleCoverageSchema = z.object({
  roleType: nonEmptyString.max(100),
  roleLabel: z.string().trim().max(200).optional(),
  primaryPersonId: nonEmptyString,
  secondaryPersonIds: z.array(z.string()).default([]),
})

// --- Intelligence ---

/** POST /api/org/intelligence/snapshots/create */
export const CreateIntelligenceSnapshotSchema = z.object({
  source: z.enum(['on_demand', 'scheduled', 'manual']).optional().default('on_demand'),
})

/** PUT /api/org/intelligence/settings */
export const UpdateIntelligenceSettingsSchema = z.object({
  mgmtMediumDirectReports: z.number().int().min(1).max(50).optional(),
  mgmtHighDirectReports: z.number().int().min(1).max(100).optional(),
  availabilityStaleDays: z.number().int().min(1).max(365).optional(),
  snapshotFreshMinutes: z.number().int().min(1).max(10000).optional(),
  snapshotWarnMinutes: z.number().int().min(1).max(10000).optional(),
})

// --- Issues ---

/** POST /api/org/issues/apply */
export const ApplyIssuesSchema = z.object({
  actions: z.array(z.object({
    personId: nonEmptyString,
    patch: z.object({
      managerId: z.string().nullable().optional(),
      teamName: z.string().nullable().optional(),
      title: z.string().trim().max(200).nullable().optional(),
    }),
  })).min(1),
  suggestionRunId: z.string().optional(),
})

/** POST /api/org/issues/preview */
export const PreviewIssuesSchema = z.object({
  personIds: z.array(z.string()).min(1),
})

/** POST /api/org/issues/sync */
export const SyncIssuesSchema = z.object({
  force: z.boolean().optional().default(false),
})

// --- Work Requests ---

/** POST /api/org/work/requests */
export const CreateWorkRequestSchema = z.object({
  title: nonEmptyString.max(500),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  desiredStart: dateString.optional(),
  desiredEnd: dateString.optional(),
  effortType: z.enum(['HOURS', 'TSHIRT']).optional(),
  effortHours: z.number().min(0).max(10000).nullable().optional(),
  effortTShirt: z.enum(['XS', 'S', 'M', 'L', 'XL']).nullable().optional(),
  domainType: z.enum(['TEAM', 'DEPARTMENT', 'ROLE', 'FUNCTION', 'OTHER']).optional(),
  domainId: z.string().nullable().optional(),
  requiredRoleType: z.string().trim().max(100).nullable().optional(),
  requiredSeniority: z.enum(['JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL']).nullable().optional(),
  requesterPersonId: z.string().nullable().optional(),
  provisional: z.boolean().optional(),
  workTagIds: z.array(z.string()).optional(),
})

/** PUT /api/org/work/requests/[id] */
export const UpdateWorkRequestSchema = CreateWorkRequestSchema.partial().extend({
  timeWindow: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
})

/** POST /api/org/work/requests/[id]/acknowledge */
export const AcknowledgeWorkRequestSchema = z.object({
  accepted: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
})

/** POST /api/org/work/requests/[id]/close */
export const CloseWorkRequestSchema = z.object({
  reason: z.enum(['COMPLETED', 'CANCELLED', 'DEFERRED', 'DUPLICATE']),
  notes: z.string().trim().max(1000).optional(),
})

/** POST /api/org/work/[id]/impact */
export const CreateWorkImpactSchema = z.object({
  subjectType: z.enum(['TEAM', 'DEPARTMENT', 'PERSON', 'WORK_REQUEST', 'ROLE', 'DECISION_DOMAIN']),
  subjectId: z.string().optional(),
  roleType: z.string().trim().max(100).optional(),
  domainKey: z.string().trim().max(100).optional(),
  impactType: z.enum(['BLOCKED', 'DEPENDENT', 'INFORM', 'CONSULT']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  explanation: nonEmptyString.max(2000),
})

/** PUT /api/org/work/effort-defaults */
export const UpdateEffortDefaultsSchema = z.object({
  XS: z.number().min(0).max(1000).optional(),
  S: z.number().min(0).max(1000).optional(),
  M: z.number().min(0).max(1000).optional(),
  L: z.number().min(0).max(1000).optional(),
  XL: z.number().min(0).max(1000).optional(),
})

// --- Domains, Health, Taxonomy ---

/** POST /api/org/domains */
export const CreateDecisionDomainSchema = z.object({
  key: nonEmptyString.max(100),
  name: nonEmptyString.max(255),
  description: z.string().trim().max(1000).optional(),
  scope: z.enum(['TEAM', 'DEPARTMENT', 'FUNCTION', 'WORKSPACE']).optional(),
  ownerPersonId: z.string().nullable().optional(),
})

/** POST /api/org/health */
export const CreateHealthSignalSchema = z.object({
  type: z.enum(['CAPACITY', 'STRUCTURE', 'OWNERSHIP', 'MANAGEMENT_LOAD', 'DATA_QUALITY', 'FRESHNESS']),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']),
  title: nonEmptyString.max(500),
  description: z.string().trim().max(2000).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().nullable().optional(),
})

/** POST /api/org/health/measure */
export const MeasureHealthSchema = z.object({
  force: z.boolean().optional().default(false),
  scope: z.enum(['full', 'minimal', 'capacity', 'structure', 'ownership']).optional().default('full'),
})

/** PATCH /api/org/health/signals/[id] */
export const UpdateHealthSignalSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
})

/** POST /api/org/systems */
export const CreateSystemSchema = z.object({
  name: nonEmptyString.max(255),
  description: z.string().trim().max(1000).optional(),
  ownerPersonId: z.string().nullable().optional(),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

/** POST /api/org/taxonomy/upsert */
export const UpsertTaxonomySchema = z.object({
  kind: z.enum(['ROLE', 'SKILL']),
  labels: z.array(z.string().trim()).min(1).max(50),
})

// ============================================================================
// TIER 5 – Org Structure & People (Phase 4)
// ============================================================================

/** POST /api/org/people/archived/restore */
export const RestoreArchivedPersonSchema = z.object({
  id: z.string().uuid(),
})

/** PATCH /api/org/people/[personId]/title */
export const UpdatePersonTitleSchema = z.object({
  title: nonEmptyString.max(200),
})

/** POST /api/org/people/[personId]/responsibility-overrides */
export const AddResponsibilityOverrideSchema = z.object({
  tagId: nonEmptyString,
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
})

/** PUT /api/org/structure/departments/[departmentId]/owner */
export const UpdateDepartmentOwnerSchema = z.object({
  ownerPersonId: z.string().nullable(),
})

/** POST /api/org/structure/teams/[teamId]/members/add */
export const AddTeamMemberSchema = z.object({
  personId: nonEmptyString,
})

/** POST /api/org/structure/teams/[teamId]/members/remove */
export const RemoveTeamMemberSchema = z.object({
  personId: nonEmptyString,
})

/** PUT /api/org/structure/teams/[teamId]/owner */
export const UpdateTeamOwnerSchema = z.object({
  ownerPersonId: z.string().nullable(),
})

/** PUT /api/org/positions/[id] */
export const UpdatePositionSchema = z.object({
  title: z.string().max(200).optional(),
  teamId: z.string().nullable().optional(),
  level: z.number().int().min(1).max(10).optional(),
  parentId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

/** PUT /api/org/skills/[skillId] */
export const UpdateSkillSchema = z.object({
  name: z.string().max(100).optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
})

/** POST /api/org/teams/reorder */
export const ReorderTeamsSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
  })).min(1),
})

/** POST /api/org/views/pin */
export const PinViewSchema = z.object({
  id: z.string().uuid(),
  pinned: z.boolean(),
})

/** POST /api/org/views/default */
export const SetDefaultViewSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['VIEWER', 'EDITOR', 'ADMIN']).nullable(),
})

/** POST /api/org/custom-roles (already has OrgCustomRoleCreateSchema) */

/** PATCH /api/org/custom-roles/[roleId] */
export const UpdateCustomRoleSchema = z.object({
  name: z.string().max(100).optional(),
  key: z.string().max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  capabilities: z.array(z.string()).optional(),
})

/** PATCH /api/org/members/[memberId]/custom-role */
export const AssignCustomRoleSchema = z.object({
  customRoleId: z.string().uuid().nullable(),
})

// ============================================================================
// TIER 6 – Duplicates Management (Phase 7)
// ============================================================================

/** POST /api/org/duplicates */
export const GenerateDuplicateCandidatesSchema = z.object({
  minConfidence: z.number().min(0).max(1).optional().default(0.8),
})

/** POST /api/org/duplicates/undo */
export const UndoDuplicateMergeSchema = z.object({
  mergeLogId: z.string().uuid(),
})

/** POST /api/org/duplicates/dismiss */
export const DismissDuplicateSchema = z.object({
  id: z.string().uuid(),
})

/** POST /api/org/duplicates/merge */
export const MergeDuplicateSchema = z.object({
  candidateId: z.string().uuid(),
  canonicalId: z.string().uuid(),
  mergedId: z.string().uuid(),
})

// ============================================================================
// TIER 6 – Ownership Management (Phase 7)
// ============================================================================

/** POST /api/org/ownership/transfer */
export const TransferOwnershipSchema = z.object({
  workspaceId: z.string().uuid(),
  targetMembershipId: z.string().uuid(),
})

/** POST /api/org/ownership/assign */
export const AssignOwnershipSchema = z.object({
  entityType: z.enum(['POSITION', 'TEAM', 'DEPARTMENT', 'PROJECT']),
  entityId: nonEmptyString,
  ownerId: nonEmptyString,
})

/** POST /api/org/ownership/bulk-assign */
export const BulkAssignOwnershipSchema = z.object({
  assignments: z.array(z.object({
    entityType: z.enum(['POSITION', 'TEAM', 'DEPARTMENT', 'PROJECT']),
    entityId: z.string(),
    ownerId: z.string(),
  })).min(1),
})

// ============================================================================
// TIER 6 – Data Quality & Integrity (Phase 7)
// ============================================================================

/** POST /api/org/data-quality/resolve-manager-conflicts */
export const ResolveManagerConflictSchema = z.object({
  personId: nonEmptyString,
  keepManagerId: nonEmptyString,
  removeManagerId: nonEmptyString,
})

/** POST /api/org/data-quality/adjust-allocation */
export const AdjustAllocationSchema = z.object({
  personId: nonEmptyString,
  adjustment: z.number().min(-100).max(100),
  reason: z.string().max(500).optional(),
})

/** POST /api/org/data-quality/refresh-availability */
export const RefreshAvailabilitySchema = z.object({
  personIds: z.array(z.string()).optional(),
  forceRecalculate: z.boolean().optional().default(false),
})

/** PATCH /api/org/integrity/resolution */
export const ResolveIntegrityIssueSchema = z.object({
  issueId: nonEmptyString,
  resolution: z.enum(['FIXED', 'IGNORED', 'DEFERRED']),
  notes: z.string().max(1000).optional(),
})

// ============================================================================
// TIER 6 – Import/Export (Phase 7)
// ============================================================================

/** POST /api/org/import/preview */
export const ImportPreviewSchema = z.object({
  entity: z.enum(['manager_links', 'roles', 'availability', 'capacity']),
  csv: nonEmptyString,
})

/** POST /api/org/import/apply */
export const ImportApplySchema = z.object({
  entity: z.enum(['manager_links', 'roles', 'availability', 'capacity']),
  csv: nonEmptyString,
})

// ============================================================================
// TIER 6 – Org Views (Phase 7)
// ============================================================================

/** POST /api/org/views */
export const CreateOrgViewSchema = z.object({
  name: nonEmptyString.max(100),
  key: z.string().max(50).optional(),
  scope: z.enum(['people', 'teams', 'departments']).default('people'),
  filters: z.record(z.string(), z.unknown()),
  shared: z.boolean().optional().default(false),
})

/** PATCH /api/org/views/[viewId] */
export const UpdateOrgViewSchema = z.object({
  name: z.string().max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  shared: z.boolean().optional(),
})

// ============================================================================
// TIER 6 – Org Bootstrap (Phase 7 - moved from inline)
// ============================================================================

/** POST /api/org/bootstrap - Department schema */
export const OrgBootstrapDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional().default(''),
})

/** POST /api/org/bootstrap - Team schema */
export const OrgBootstrapTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional().default(''),
})

/** POST /api/org/bootstrap - Role card schema */
export const OrgBootstrapRoleCardSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional().default(''),
  level: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE']),
})

/** POST /api/org/bootstrap - Invite schema */
export const OrgBootstrapInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
  positionIndex: z.number().int().min(0),
})

/** POST /api/org/bootstrap - Main schema */
export const OrgBootstrapSchema = z.object({
  department: OrgBootstrapDepartmentSchema,
  team: OrgBootstrapTeamSchema,
  roleCards: z.array(OrgBootstrapRoleCardSchema).min(2, 'At least 2 role cards required').max(5),
  invite: OrgBootstrapInviteSchema.optional(),
})

// ============================================================================
// TIER 6 – Org Miscellaneous (Phase 7)
// ============================================================================

/** POST /api/org/track */
export const OrgTrackEventSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  name: z.string().optional(),
  route: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
})

/** POST /api/org/onboarding/complete */
export const CompleteOrgOnboardingSchema = z.object({
  step: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/** POST /api/org/delete (confirmation) */
export const DeleteOrgConfirmationSchema = z.object({
  confirm: z.literal('DELETE'),
})

// ============================================================================
// Digest config (Phase 7)
// ============================================================================

/** POST /api/org/digest/config */
export const DigestConfigSchema = z.object({
  enabled: z.boolean(),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().max(200).optional(),
      })
    )
    .optional()
    .default([]),
})

// ============================================================================
// Roles (custom workspace roles) — UpdateRoleSchema for PUT /api/org/roles/[id]
// ============================================================================

/** PUT /api/org/roles/[id] */
export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  responsibilities: z
    .array(
      z.object({
        scope: z.enum(['OWNERSHIP', 'DECISION', 'EXECUTION']).optional(),
        target: z.string().min(1).max(500),
      })
    )
    .optional(),
})
