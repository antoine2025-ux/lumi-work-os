import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { blogPrisma } from "@/lib/blog-db"

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
  } catch (error) {
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

    let body
    try {
      body = await request.json()
      console.log("[BLOG API] Request body parsed:", { 
        title: body.title, 
        slug: body.slug, 
        excerpt: body.excerpt?.substring(0, 50), 
        contentLength: body.content?.length,
        category: body.category,
        status: body.status 
      })
    } catch (parseError) {
      console.error("[BLOG API] Failed to parse request body:", parseError)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const { title, slug, excerpt, content, category, status } = body

    // Sanitize slug: trim whitespace and ensure it's URL-safe
    const sanitizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

    if (!title || !slug || !excerpt || !content || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    try {
      // First verify connection and table
      console.log("[BLOG API] Verifying database connection before slug check...")
      const dbInfo = await blogPrisma.$queryRaw<Array<{ current_database: string, current_schema: string }>>`
        SELECT current_database(), current_schema()
      `
      console.log("[BLOG API] Connected to:", dbInfo[0]?.current_database, "Schema:", dbInfo[0]?.current_schema)
      
      const tableCheck = await blogPrisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'blog_posts'
        ) as exists
      `
      console.log("[BLOG API] blog_posts table exists:", tableCheck[0]?.exists)
      
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
    } catch (slugCheckError: any) {
      console.error("[BLOG API] Slug check error:", slugCheckError.message, slugCheckError.code)
      console.error("[BLOG API] Error stack:", slugCheckError.stack)
      // If it's a table not found error, provide helpful message
      if (slugCheckError.code === 'P2021') {
        return NextResponse.json(
          { 
            error: "Database table not found",
            details: slugCheckError.message,
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
    const publishedAt = validStatus === "PUBLISHED" ? new Date() : null

    console.log("[BLOG API] Creating post with:", { title, slug, status: validStatus, publishedAt })

    try {
      const post = await blogPrisma.blogPost.create({
        data: {
          title,
          slug: sanitizedSlug,
          excerpt,
          content,
          category: category || "NEWS",
          status: validStatus,
          publishedAt,
        },
      })

      console.log("[BLOG API] Blog post created successfully:", post.id)
      return NextResponse.json({ post })
    } catch (prismaError) {
      console.error("[BLOG API] Prisma error:", prismaError)
      const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : String(prismaError)
      const prismaErrorCode = (prismaError as any)?.code
      console.error("[BLOG API] Prisma error details:", { 
        message: prismaErrorMessage, 
        code: prismaErrorCode,
        error: prismaError 
      })
      throw prismaError // Re-throw to be caught by outer catch
    }
  } catch (error) {
    return handleApiError(error)
  }
}

