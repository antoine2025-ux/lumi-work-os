import { z } from 'zod'

export const SpaceVisibilityEnum = z.enum(['PERSONAL', 'PRIVATE', 'PUBLIC'])
export const SpaceRoleEnum = z.enum(['OWNER', 'EDITOR', 'VIEWER'])

export const CreateSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  visibility: SpaceVisibilityEnum.default('PUBLIC'),
  parentId: z.string().optional(),
})

export const UpdateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  visibility: SpaceVisibilityEnum.optional(),
})

export const AddSpaceMemberSchema = z.object({
  userId: z.string().min(1),
  role: SpaceRoleEnum.default('VIEWER'),
})

export type CreateSpaceData = z.infer<typeof CreateSpaceSchema>
export type UpdateSpaceData = z.infer<typeof UpdateSpaceSchema>
export type AddSpaceMemberData = z.infer<typeof AddSpaceMemberSchema>
