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
