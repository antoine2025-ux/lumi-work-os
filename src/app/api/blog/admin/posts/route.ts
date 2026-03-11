import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { blogPrisma } from "@/lib/blog-db"
import { BlogPostCreateSchema } from '@/lib/validations/blog'
import { BlogPostCategory } from '@prisma/client'

// GET /api/blog/admin/posts - List all posts
export async function GET(request: NextRequest) {
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

    const posts = await blogPrisma.blogPost.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({ posts })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// POST /api/blog/admin/posts - Create new post
export async function POST(request: NextRequest) {
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

    const body = BlogPostCreateSchema.parse(await request.json())
    const { title, slug, excerpt, content, category, status, featuredImage, tags } = body

    // Sanitize slug: trim whitespace and ensure it's URL-safe
    const sanitizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

    // Check if slug already exists
    try {
      // First verify connection and table
      const dbInfo = await blogPrisma.$queryRaw<Array<{ current_database: string, current_schema: string }>>`
        SELECT current_database(), current_schema()
      `
      const tableCheck = await blogPrisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'blog_posts'
        ) as exists
      `
      if (!tableCheck[0]?.exists) {
        return NextResponse.json(
          { 
            error: "Database table not found",
            details: `Table blog_posts does not exist in database ${dbInfo[0]?.current_database}`,
            suggestion: "Please run: npx prisma migrate dev"
          },
          { status: 500 }
        )
      }
      
      const existingPost = await blogPrisma.blogPost.findUnique({
        where: { slug: sanitizedSlug },
      })

      if (existingPost) {
        return NextResponse.json(
          { error: "A post with this slug already exists" },
          { status: 409 }
        )
      }
    } catch (slugCheckError: unknown) {
      const message = slugCheckError instanceof Error ? slugCheckError.message : 'Unknown error'
      const code = slugCheckError && typeof slugCheckError === 'object' && 'code' in slugCheckError
        ? (slugCheckError as { code: string }).code
        : undefined
      // If it's a table not found error, provide helpful message
      if (code === 'P2021') {
        return NextResponse.json(
          { 
            error: "Database table not found",
            details: message,
            suggestion: "Please run: npx prisma migrate dev"
          },
          { status: 500 }
        )
      }
      throw slugCheckError
    }

    // Validate and set status
    const validStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
    
    // Set publishedAt if status is PUBLISHED
    const finalPublishedAt = validStatus === "PUBLISHED" ? new Date() : null

    try {
      const post = await blogPrisma.blogPost.create({
        data: {
          title,
          slug: sanitizedSlug,
          excerpt,
          content,
          category: category as BlogPostCategory,
          status: validStatus,
          publishedAt: finalPublishedAt,
        },
      })

      return NextResponse.json({ post })
    } catch (prismaError) {
      throw prismaError // Re-throw to be caught by outer catch
    }
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

