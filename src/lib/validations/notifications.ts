import { z } from 'zod'

export const NotificationQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
  cursor: z.string().uuid().optional(),
})

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const NotificationPreferenceUpdateSchema = z.object({
  notificationType: z.string().min(1),
  enabled: z.boolean(),
})

export const NotificationPreferenceListSchema = z.object({
  userId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
})
