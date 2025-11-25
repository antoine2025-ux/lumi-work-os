import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
  };
  publishedAt: string;
  tags: string[];
  readingTime?: number;
  coverImage?: string;
  updatedAt?: string;
}

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/**
 * Get all blog posts from markdown files
 */
export function getAllBlogPosts(): BlogPost[] {
  try {
    if (!fs.existsSync(BLOG_DIR)) {
      console.warn(`Blog directory not found: ${BLOG_DIR}`);
      return [];
    }

    const files = fs.readdirSync(BLOG_DIR);
    const posts = files
      .filter((file) => file.endsWith(".md") && file !== "README.md")
      .map((file) => {
        const filePath = path.join(BLOG_DIR, file);
        const fileContents = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter(fileContents);

        return {
          slug: data.slug || file.replace(/\.md$/, ""),
          title: data.title || "",
          excerpt: data.excerpt || "",
          content: content.trim(),
          author: {
            name: data.author || "Loopwell Team",
          },
          publishedAt: data.publishedAt || new Date().toISOString(),
          tags: Array.isArray(data.tags) ? data.tags : [],
          readingTime: data.readingTime,
          coverImage: data.coverImage,
          updatedAt: data.updatedAt,
        } as BlogPost;
      })
      .filter((post) => post.title) // Filter out posts without titles
      .sort((a, b) => {
        // Sort by published date, newest first
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

    return posts;
  } catch (error) {
    console.error("Error reading blog posts:", error);
    return [];
  }
}

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string): BlogPost | null {
  const posts = getAllBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

/**
 * Direct blog posts array (for backward compatibility with dev editor)
 * This is used by the dev blog editor to manage posts
 */
export const directBlogPosts: BlogPost[] = getAllBlogPosts();
