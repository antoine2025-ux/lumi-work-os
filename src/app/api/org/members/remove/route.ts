import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as removeHandler } from "@/server/api/org/members/remove"

export async function POST(request: NextRequest) {
  try {
    return await removeHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
