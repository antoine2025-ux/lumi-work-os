import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

// Use a direct Prisma client for blog posts (global, not workspace-scoped)
const globalForBlogPrisma = globalThis as unknown as {
  blogPrisma: PrismaClient | undefined
}

const blogPrisma =
  globalForBlogPrisma.blogPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  })

if (process.env.NODE_ENV !== "production") {
  globalForBlogPrisma.blogPrisma = blogPrisma
}

// GET /api/blog/posts - Get all published blog posts
export async function GET() {
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
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

