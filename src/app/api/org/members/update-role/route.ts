import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as updateRoleHandler } from "@/server/api/org/members/updateRole"

export async function POST(request: NextRequest) {
  try {
    return await updateRoleHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
