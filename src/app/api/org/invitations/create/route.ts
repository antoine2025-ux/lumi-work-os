import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as createHandler } from "@/server/api/org/invitations/create"

export async function POST(request: NextRequest) {
  try {
    return await createHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
