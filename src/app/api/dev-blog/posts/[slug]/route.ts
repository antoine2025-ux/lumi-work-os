import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/dev-auth";
import { getBlogPost } from "@/lib/blog";
import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireDevAuth(request);
    const data = await request.json();

    // Check if post exists
    const existingPost = getBlogPost(slug);
    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Determine the new slug (might be different if slug was changed)
    const newSlug = data.slug || slug;
    const oldFilePath = path.join(BLOG_DIR, `${slug}.md`);
    const newFilePath = path.join(BLOG_DIR, `${newSlug}.md`);

    // Create frontmatter object
    const frontmatter = {
      slug: newSlug,
      title: data.title,
      excerpt: data.excerpt || "",
      author: data.author || existingPost.author.name,
      publishedAt: data.publishedAt || existingPost.publishedAt,
      tags: data.tags || [],
      readingTime: data.readingTime || existingPost.readingTime || 5,
    };

    // Format frontmatter as YAML (matching existing format)
    const frontmatterString = `---\n${Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
        }
        // Only quote strings that contain spaces or special characters
        if (typeof value === "string" && (value.includes(" ") || value.includes(":"))) {
          return `${key}: "${value}"`;
        }
        return `${key}: ${value}`;
      })
      .join("\n")}\n---\n\n`;

    // Combine frontmatter and content
    const markdownContent = frontmatterString + (data.content || "");

    // If slug changed, delete old file
    if (newSlug !== slug && fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // Write markdown file
    fs.writeFileSync(newFilePath, markdownContent, "utf8");

    // Return the updated post
    const updatedPost = {
      slug: newSlug,
      title: data.title,
      excerpt: data.excerpt || "",
      content: data.content || "",
      author: {
        name: data.author || existingPost.author.name,
      },
      publishedAt: frontmatter.publishedAt,
      tags: data.tags || [],
      readingTime: data.readingTime || existingPost.readingTime || 5,
    };

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update post" },
      { status: 500 }
    );
  }
}

