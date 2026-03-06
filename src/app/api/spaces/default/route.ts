import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { getDefaultSpaceForUser } from '@/lib/spaces/get-default-space'
import { handleApiError } from '@/lib/api-errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const defaultSpaceId = await getDefaultSpaceForUser(
      auth.user.userId,
      auth.workspaceId
    )
    
    return NextResponse.json({ 
      defaultSpaceId,
      workspaceId: auth.workspaceId 
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
