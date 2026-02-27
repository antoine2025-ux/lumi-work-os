import { z } from 'zod'

export const GmailSendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string(),
  replyToMessageId: z.string().optional(),
  replyToThreadId: z.string().optional(),
})

export const GmailArchiveSchema = z.object({
  messageId: z.string().min(1),
})

export type GmailSendInput = z.infer<typeof GmailSendSchema>
export type GmailArchiveInput = z.infer<typeof GmailArchiveSchema>
