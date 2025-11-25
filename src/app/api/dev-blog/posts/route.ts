import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/dev-auth";
import { getAllBlogPosts } from "@/lib/blog";
import { PrismaClient } from "@prisma/client";

// Lazy-load Prisma client for blog posts to ensure it's fresh
// Blog posts are public and don't need workspace scoping
let blogPrismaInstance: PrismaClient | null = null;

function getBlogPrisma(): PrismaClient {
  if (!blogPrismaInstance) {
    blogPrismaInstance = new PrismaClient();
    // Verify BlogPost model exists
    if (typeof blogPrismaInstance.blogPost === 'undefined') {
      throw new Error('Prisma Client missing BlogPost model - run: npx prisma generate');
    }
  }
  return blogPrismaInstance;
}

export async function GET(request: NextRequest) {
  try {
    await requireDevAuth(request);
    const posts = await getAllBlogPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireDevAuth(request);
    const data = await request.json();

    // Generate slug from title if not provided
    const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Parse published date
    const publishedAt = data.publishedAt 
      ? new Date(data.publishedAt) 
      : new Date();

    // Create blog post in database (use direct client to avoid scoping issues)
    const blogPrisma = getBlogPrisma();
    const newPost = await blogPrisma.blogPost.create({
      data: {
        slug: slug,
        title: data.title,
        excerpt: data.excerpt || "",
        content: data.content || "",
        authorName: data.author || "Loopwell Team",
        publishedAt: publishedAt,
        tags: data.tags || [],
        readingTime: data.readingTime || 5,
        coverImage: data.coverImage || null,
      },
    });

    // Return the created post in the expected format
    return NextResponse.json({
      success: true,
      post: {
        slug: newPost.slug,
        title: newPost.title,
        excerpt: newPost.excerpt,
        content: newPost.content,
        author: {
          name: newPost.authorName,
        },
        publishedAt: newPost.publishedAt.toISOString(),
        tags: newPost.tags,
        readingTime: newPost.readingTime || 5,
        coverImage: newPost.coverImage || undefined,
      },
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${error.message} (Code: ${error.code || 'N/A'})`
      : "Failed to create post";
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
