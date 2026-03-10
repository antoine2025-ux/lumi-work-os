import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as cancelHandler } from "@/server/api/org/invitations/cancel"

export async function POST(request: NextRequest) {
  try {
    return await cancelHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
