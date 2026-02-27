import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { blogPrisma } from "@/lib/blog-db"

// GET /api/blog/admin/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const { id } = await params
    const post = await blogPrisma.blogPost.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/blog/admin/posts/[id] - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const { id } = await params
    const body = await request.json()
    const { title, slug, excerpt, content, category, status } = body

    // Sanitize slug: trim whitespace and ensure it's URL-safe
    const sanitizedSlug = slug ? slug.trim().toLowerCase().replace(/\s+/g, '-') : undefined

    // Get existing post to check slug conflicts
    const existingPost = await blogPrisma.blogPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if new slug conflicts with another post
    if (sanitizedSlug && sanitizedSlug !== existingPost.slug) {
      const slugConflict = await blogPrisma.blogPost.findUnique({
        where: { slug: sanitizedSlug },
      })

      if (slugConflict && slugConflict.id !== id) {
        return NextResponse.json(
          { error: "A post with this slug already exists" },
          { status: 409 }
        )
      }
    }

    // Determine publishedAt based on status change
    let publishedAt = existingPost.publishedAt
    if (status === "PUBLISHED" && !existingPost.publishedAt) {
      // First time publishing - set publishedAt to now
      publishedAt = new Date()
    } else if (status === "DRAFT") {
      // Unpublishing - keep existing publishedAt (for history)
      // Or set to null if you want to clear it
      // publishedAt = null
    }

    const post = await blogPrisma.blogPost.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(sanitizedSlug && { slug: sanitizedSlug }),
        ...(excerpt && { excerpt }),
        ...(content && { content }),
        ...(category && { category }),
        ...(status && { status }),
        ...(publishedAt !== undefined && { publishedAt }),
      },
    })

    return NextResponse.json({ post })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/blog/admin/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const { id } = await params

    await blogPrisma.blogPost.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

