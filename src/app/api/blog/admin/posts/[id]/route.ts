import { NextRequest, NextResponse } from "next/server"
import { checkBlogAdmin } from "@/lib/blog-admin-auth"
import { blogPrisma } from "@/lib/blog-db"

// GET /api/blog/admin/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkBlogAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const post = await blogPrisma.blogPost.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/blog/admin/posts/[id] - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkBlogAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    console.error("Error updating blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/blog/admin/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkBlogAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await blogPrisma.blogPost.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting blog post:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

