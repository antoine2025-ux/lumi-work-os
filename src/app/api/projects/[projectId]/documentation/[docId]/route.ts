import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { prisma } from '@/lib/db'

// DELETE /api/projects/[projectId]/documentation/[docId] - Detach documentation from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const { projectId, docId } = resolvedParams

    if (!projectId || !docId) {
      return NextResponse.json({ error: 'Project ID and documentation ID are required' }, { status: 400 })
    }

    // Check project access (require MEMBER or higher to detach docs)
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    await assertProjectAccess(nextAuthUser, projectId, 'MEMBER')

    // Verify the documentation link exists and belongs to this project
    const documentationLink = await prisma.projectDocumentation.findUnique({
      where: { id: docId },
      select: { id: true, projectId: true }
    })

    if (!documentationLink) {
      return NextResponse.json({ error: 'Documentation link not found' }, { status: 404 })
    }

    if (documentationLink.projectId !== projectId) {
      return NextResponse.json({ 
        error: 'Documentation link does not belong to this project' 
      }, { status: 403 })
    }

    // Delete the documentation link
    await prisma.projectDocumentation.delete({
      where: { id: docId }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error detaching documentation:', error)
    
    if (error.message === 'Unauthorized: User not authenticated.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.') {
      return NextResponse.json({ error: 'Forbidden: Insufficient project permissions' }, { status: 403 })
    }
    
    console.error('[ProjectDocumentation] Unexpected error:', error)
    console.error('[ProjectDocumentation] Error stack:', error.stack)
    
    // In development, return full error details to help debug
    const errorDetails = process.env.NODE_ENV === 'development' ? {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n')
    } : {
      code: error.code,
      message: error.message
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorDetails
    }, { status: 500 })
  }
}

