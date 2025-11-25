/**
 * Migration Template: Express Route → Next.js API Route
 * 
 * Use this template when converting Express routes to Next.js API routes
 * 
 * Steps:
 * 1. Copy this template
 * 2. Replace placeholder comments with actual code
 * 3. Follow the patterns shown
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// ============================================================================
// TEMPLATE: GET /api/resource
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access (adjust requireRole as needed)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] // or ['ADMIN', 'OWNER'] for write operations
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url)
    const filterParam = searchParams.get('filterParam') // Replace with actual params

    // 5. Build Prisma query
    const where: any = {
      workspaceId: auth.workspaceId // ALWAYS filter by workspace
    }

    // Add filters
    if (filterParam) {
      where.someField = filterParam
    }

    // 6. Execute Prisma query
    const results = await prisma.modelName.findMany({
      where,
      include: {
        // Include relations as needed
        relatedModel: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 7. Return response
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error fetching resource:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch resource' 
    }, { status: 500 })
  }
}

// ============================================================================
// TEMPLATE: POST /api/resource
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access (usually ADMIN/OWNER for create)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // 3. Parse request body
    const body = await request.json()
    const { 
      field1,
      field2,
      // ... other fields
    } = body

    // 4. Validate required fields
    if (!field1) {
      return NextResponse.json({ 
        error: 'Missing required field: field1' 
      }, { status: 400 })
    }

    // 5. Check for duplicates (if applicable)
    const existing = await prisma.modelName.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        uniqueField: field1
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'Resource already exists' 
      }, { status: 409 })
    }

    // 6. Create record
    const result = await prisma.modelName.create({
      data: {
        workspaceId: auth.workspaceId, // ALWAYS include workspaceId
        field1: field1?.trim() || null,
        field2: field2 || null,
        // ... other fields
      },
      include: {
        // Include relations for response
        relatedModel: true
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error creating resource:', error)
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Resource already exists' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create resource' 
    }, { status: 500 })
  }
}

// ============================================================================
// TEMPLATE: PUT /api/resource/[id] (in [id]/route.ts)
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { field1, field2 } = body

    // Verify resource exists and belongs to workspace
    const existing = await prisma.modelName.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Resource not found' 
      }, { status: 404 })
    }

    // Update resource
    const result = await prisma.modelName.update({
      where: { id },
      data: {
        field1: field1 !== undefined ? field1?.trim() || null : undefined,
        field2: field2 !== undefined ? field2 : undefined,
        // Only update fields that are provided
      },
      include: {
        relatedModel: true
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update resource' 
    }, { status: 500 })
  }
}

// ============================================================================
// TEMPLATE: DELETE /api/resource/[id] (in [id]/route.ts)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify resource exists and belongs to workspace
    const existing = await prisma.modelName.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Resource not found' 
      }, { status: 404 })
    }

    // Delete resource (cascades handled by Prisma)
    await prisma.modelName.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to delete resource' 
    }, { status: 500 })
  }
}

// ============================================================================
// CONVERSION CHECKLIST
// ============================================================================
/*
When converting Express route, check:

✅ Authentication
  - Replace JWT middleware with getUnifiedAuth()
  - Remove req.user, use auth.user instead

✅ Authorization
  - Add assertAccess() call
  - Determine appropriate requireRole

✅ Workspace Scoping
  - Add workspaceId to all queries
  - Use setWorkspaceContext()

✅ Database Queries
  - Replace raw SQL with Prisma queries
  - Use Prisma types instead of raw results

✅ Error Handling
  - Handle Prisma error codes (P2002, P2025, etc.)
  - Return appropriate HTTP status codes

✅ Request/Response
  - Replace req.body with await request.json()
  - Replace req.query with URL searchParams
  - Replace res.json() with NextResponse.json()

✅ TypeScript
  - Add proper types
  - Use Prisma generated types

✅ File Structure
  - List routes: src/app/api/resource/route.ts
  - Individual routes: src/app/api/resource/[id]/route.ts
*/



