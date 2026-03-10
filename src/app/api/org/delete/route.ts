import { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api-errors'
import { POST as deleteHandler } from "@/server/api/org/delete"

export async function POST(request: NextRequest) {
  try {
    return await deleteHandler(request)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
