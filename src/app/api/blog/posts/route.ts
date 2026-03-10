import { NextRequest, NextResponse } from "next/server"
import { blogPrisma } from "@/lib/blog-db"
import { rateLimit } from "@/lib/rate-limit"
import { handleApiError } from "@/lib/api-errors"
import { rateLimitExceeded } from "@/lib/rate-limit-response"

// GET /api/blog/posts - Get all published blog posts
export async function GET(request: NextRequest) {
  const limit = await rateLimit(request, { windowMs: 60 * 1000, max: 30, identifier: 'blog-posts' })
  if (!limit.success) return rateLimitExceeded(limit.resetAt)
  try {
    const posts = await blogPrisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ posts })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

