import { NextRequest, NextResponse } from "next/server"
import { blogPrisma } from "@/lib/blog-db"

// Test route to verify database connection and slug lookup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Test 1: Find by slug only
    const postBySlug = await blogPrisma.blogPost.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    })
    
    // Test 2: Find published post
    const publishedPost = await blogPrisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    })
    
    // Test 3: List all posts
    const allPosts = await blogPrisma.blogPost.findMany({
      select: {
        slug: true,
        title: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    })
    
    return NextResponse.json({
      requestedSlug: slug,
      postBySlug,
      publishedPost,
      allPosts,
      message: "Database connection successful",
    })
  } catch (error) {
    console.error("[Blog Test API] Error:", error)
    return NextResponse.json(
      {
        error: "Database error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

