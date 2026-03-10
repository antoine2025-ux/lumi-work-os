import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as acceptHandler } from "@/server/api/org/invitations/accept"

export async function POST(request: NextRequest) {
  try {
    return await acceptHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
