import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { getFeatureFlags, setFeatureFlag } from "@/lib/feature-flags"
import { FeatureFlagToggleSchema } from '@/lib/validations/assistant'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })
    setWorkspaceContext(auth.workspaceId)

    const flags = await getFeatureFlags(auth.workspaceId)

    return NextResponse.json({ flags })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (admin only)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })
    setWorkspaceContext(auth.workspaceId)

    const body = FeatureFlagToggleSchema.parse(await request.json())
    const { key, enabled } = body

    await setFeatureFlag(auth.workspaceId, key, enabled)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
