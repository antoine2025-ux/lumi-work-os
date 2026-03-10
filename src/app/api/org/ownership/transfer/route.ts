import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as transferHandler } from "@/server/api/org/ownership/transfer"

export async function POST(request: NextRequest) {
  try {
    return await transferHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
