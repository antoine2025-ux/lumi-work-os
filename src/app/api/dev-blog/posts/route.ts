import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/dev-auth";
import { getAllBlogPosts } from "@/lib/blog";
import { prisma } from "@/lib/db";

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

    // Create blog post in database
    const newPost = await prisma.blogPost.create({
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
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
