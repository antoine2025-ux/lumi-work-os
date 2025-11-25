import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/dev-auth";
import { getBlogPost } from "@/lib/blog";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireDevAuth(request);
    const data = await request.json();

    // Check if post exists in database
    const existingDbPost = await prisma.blogPost.findUnique({
      where: { slug },
    });

    // If not in database, check files
    let existingPost = null;
    if (existingDbPost) {
      existingPost = {
        slug: existingDbPost.slug,
        title: existingDbPost.title,
        excerpt: existingDbPost.excerpt,
        content: existingDbPost.content,
        author: {
          name: existingDbPost.authorName,
        },
        publishedAt: existingDbPost.publishedAt.toISOString(),
        tags: existingDbPost.tags,
        readingTime: existingDbPost.readingTime || undefined,
      };
    } else {
      existingPost = await getBlogPost(slug);
    }

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Determine the new slug (might be different if slug was changed)
    const newSlug = data.slug || slug;

    // Parse published date
    const publishedAt = data.publishedAt 
      ? new Date(data.publishedAt) 
      : existingDbPost 
        ? existingDbPost.publishedAt 
        : new Date(existingPost.publishedAt);

    // Update or create in database
    let updatedPost;
    if (existingDbPost) {
      // Update existing database post
      if (newSlug !== slug) {
        // Slug changed - delete old and create new
        await prisma.blogPost.delete({ where: { slug } });
        updatedPost = await prisma.blogPost.create({
          data: {
            slug: newSlug,
            title: data.title,
            excerpt: data.excerpt || "",
            content: data.content || "",
            authorName: data.author || existingPost.author.name,
            publishedAt: publishedAt,
            tags: data.tags || [],
            readingTime: data.readingTime || existingPost.readingTime || 5,
            coverImage: data.coverImage || null,
          },
        });
      } else {
        // Update in place
        updatedPost = await prisma.blogPost.update({
          where: { slug },
          data: {
            title: data.title,
            excerpt: data.excerpt || "",
            content: data.content || "",
            authorName: data.author || existingPost.author.name,
            publishedAt: publishedAt,
            tags: data.tags || [],
            readingTime: data.readingTime || existingPost.readingTime || 5,
            coverImage: data.coverImage || null,
          },
        });
      }
    } else {
      // Create new database post from file-based post
      updatedPost = await prisma.blogPost.create({
        data: {
          slug: newSlug,
          title: data.title,
          excerpt: data.excerpt || "",
          content: data.content || "",
          authorName: data.author || existingPost.author.name,
          publishedAt: publishedAt,
          tags: data.tags || [],
          readingTime: data.readingTime || existingPost.readingTime || 5,
          coverImage: data.coverImage || null,
        },
      });
    }

    // Return the updated post in the expected format
    return NextResponse.json({
      success: true,
      post: {
        slug: updatedPost.slug,
        title: updatedPost.title,
        excerpt: updatedPost.excerpt,
        content: updatedPost.content,
        author: {
          name: updatedPost.authorName,
        },
        publishedAt: updatedPost.publishedAt.toISOString(),
        tags: updatedPost.tags,
        readingTime: updatedPost.readingTime || 5,
        coverImage: updatedPost.coverImage || undefined,
      },
    });
  } catch (error: any) {
    console.error("Error updating post:", error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to update post" },
      { status: 500 }
    );
  }
}
