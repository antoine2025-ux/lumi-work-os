import { z } from 'zod'
import { nonEmptyString, emailString } from './common'

// ---------------------------------------------------------------------------
// Admin Onboarding Wizard – Zod schemas for each step
// ---------------------------------------------------------------------------

/** Company size tiers – determines which onboarding steps are shown. */
export const CompanySizeEnum = z.enum(['solo', '2-10', '11-50', '50+'])
export type CompanySize = z.infer<typeof CompanySizeEnum>

/** Invite role options. */
export const InviteRoleEnum = z.enum(['ADMIN', 'MEMBER', 'VIEWER'])

/** Company type options for Step 4. */
export const CompanyTypeEnum = z.enum([
  'saas',
  'agency',
  'ecommerce',
  'healthcare',
  'financial',
  'manufacturing',
  'other',
])
export type CompanyType = z.infer<typeof CompanyTypeEnum>

// ---------------------------------------------------------------------------
// Step 1: Welcome & Workspace Setup
// ---------------------------------------------------------------------------

export const OnboardingStep1Schema = z.object({
  workspaceName: nonEmptyString.min(2, 'Workspace name must be at least 2 characters').max(100),
  adminName: nonEmptyString.max(100),
  adminTitle: nonEmptyString.max(100),
  companySize: CompanySizeEnum,
})

export type OnboardingStep1Data = z.infer<typeof OnboardingStep1Schema>

// ---------------------------------------------------------------------------
// Step 2: Invite Team (optional)
// ---------------------------------------------------------------------------

export const InviteEntrySchema = z.object({
  email: emailString,
  role: InviteRoleEnum,
})

export const OnboardingStep2Schema = z.object({
  invites: z.array(InviteEntrySchema).optional(),
  skipped: z.boolean().optional(),
})

export type OnboardingStep2Data = z.infer<typeof OnboardingStep2Schema>

// ---------------------------------------------------------------------------
// Step 3: Org Structure (Startup+ tier)
// ---------------------------------------------------------------------------

export const DepartmentEntrySchema = z.object({
  name: nonEmptyString.min(2, 'Department name must be at least 2 characters').max(100),
  leadName: z.string().max(100).optional(),
})

export const TeamEntrySchema = z.object({
  name: nonEmptyString.min(2, 'Team name must be at least 2 characters').max(100),
  departmentName: nonEmptyString,
})

export const OnboardingStep3Schema = z.object({
  departments: z.array(DepartmentEntrySchema).optional(),
  teams: z.array(TeamEntrySchema).optional(),
  skipped: z.boolean().optional(),
})

export type OnboardingStep3Data = z.infer<typeof OnboardingStep3Schema>

// ---------------------------------------------------------------------------
// Step 4: Company Type
// ---------------------------------------------------------------------------

export const OnboardingStep4Schema = z.object({
  companyType: CompanyTypeEnum,
})

export type OnboardingStep4Data = z.infer<typeof OnboardingStep4Schema>

// ---------------------------------------------------------------------------
// Step 5: Ready! (confirmation only)
// ---------------------------------------------------------------------------

export const OnboardingStep5Schema = z.object({
  confirm: z.literal(true),
})

export type OnboardingStep5Data = z.infer<typeof OnboardingStep5Schema>

// ---------------------------------------------------------------------------
// Discriminated union for the progress POST endpoint
// ---------------------------------------------------------------------------

export const OnboardingStepSubmissionSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal(1), data: OnboardingStep1Schema }),
  z.object({ step: z.literal(2), data: OnboardingStep2Schema }),
  z.object({ step: z.literal(3), data: OnboardingStep3Schema }),
  z.object({ step: z.literal(4), data: OnboardingStep4Schema }),
  z.object({ step: z.literal(5), data: OnboardingStep5Schema }),
])

export type OnboardingStepSubmission = z.infer<typeof OnboardingStepSubmissionSchema>
