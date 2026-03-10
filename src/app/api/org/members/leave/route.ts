import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as leaveHandler } from "@/server/api/org/members/leave"

export async function POST(request: NextRequest) {
  try {
    return await leaveHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
