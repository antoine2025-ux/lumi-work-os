import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/dev-auth";
import { getAllBlogPosts } from "@/lib/blog";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export async function GET(request: NextRequest) {
  try {
    await requireDevAuth(request);
    const posts = getAllBlogPosts();
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

    // Create frontmatter object
    const frontmatter = {
      slug: slug,
      title: data.title,
      excerpt: data.excerpt || "",
      author: data.author || "Loopwell Team",
      publishedAt: data.publishedAt || new Date().toISOString().split("T")[0],
      tags: data.tags || [],
      readingTime: data.readingTime || 5,
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

    // Ensure blog directory exists
    if (!fs.existsSync(BLOG_DIR)) {
      fs.mkdirSync(BLOG_DIR, { recursive: true });
    }

    // Write markdown file
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, markdownContent, "utf8");

    // Return the created post
    const newPost = {
      slug: slug,
      title: data.title,
      excerpt: data.excerpt || "",
      content: data.content || "",
      author: {
        name: data.author || "Loopwell Team",
      },
      publishedAt: frontmatter.publishedAt,
      tags: data.tags || [],
      readingTime: data.readingTime || 5,
    };

    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create post" },
      { status: 500 }
    );
  }
}

