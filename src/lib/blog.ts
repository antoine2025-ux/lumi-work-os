import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { prisma } from "@/lib/db";

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
 * Get all blog posts - reads from database first, then falls back to markdown files
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];
  
  try {
    // Try to read from database first
    const dbPosts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: 'desc' },
    });
    
    for (const post of dbPosts) {
      posts.push({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        author: {
          name: post.authorName,
        },
        publishedAt: post.publishedAt.toISOString(),
        tags: post.tags,
        readingTime: post.readingTime || undefined,
        coverImage: post.coverImage || undefined,
        updatedAt: post.updatedAt.toISOString(),
      });
    }
  } catch (error) {
    console.warn("Error reading blog posts from database:", error);
    // Fall back to markdown files if database fails
  }

  // Also read from markdown files (for backward compatibility)
  try {
    if (fs.existsSync && fs.existsSync(BLOG_DIR)) {
      const files = fs.readdirSync(BLOG_DIR);
      const filePosts = files
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
        .filter((post) => post.title);

      // Merge file posts, avoiding duplicates (prefer database posts)
      for (const filePost of filePosts) {
        if (!posts.find(p => p.slug === filePost.slug)) {
          posts.push(filePost);
        }
      }
    }
  } catch (error) {
    console.warn("Error reading blog posts from files:", error);
  }

  // Sort by published date, newest first
  return posts.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

/**
 * Get a single blog post by slug - checks database first, then files
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    // Try database first
    const dbPost = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (dbPost) {
      return {
        slug: dbPost.slug,
        title: dbPost.title,
        excerpt: dbPost.excerpt,
        content: dbPost.content,
        author: {
          name: dbPost.authorName,
        },
        publishedAt: dbPost.publishedAt.toISOString(),
        tags: dbPost.tags,
        readingTime: dbPost.readingTime || undefined,
        coverImage: dbPost.coverImage || undefined,
        updatedAt: dbPost.updatedAt.toISOString(),
      };
    }
  } catch (error) {
    console.warn("Error reading blog post from database:", error);
  }

  // Fall back to files
  try {
    if (fs.existsSync && fs.existsSync(BLOG_DIR)) {
      const files = fs.readdirSync(BLOG_DIR);
      for (const file of files) {
        if (file.endsWith(".md") && file !== "README.md") {
          const filePath = path.join(BLOG_DIR, file);
          const fileContents = fs.readFileSync(filePath, "utf8");
          const { data, content } = matter(fileContents);
          const fileSlug = data.slug || file.replace(/\.md$/, "");
          
          if (fileSlug === slug) {
            return {
              slug: fileSlug,
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
            };
          }
        }
      }
    }
  } catch (error) {
    console.warn("Error reading blog post from files:", error);
  }

  return null;
}

/**
 * Direct blog posts array (for backward compatibility with dev editor)
 * This is used by the dev blog editor to manage posts
 */
export async function getDirectBlogPosts(): Promise<BlogPost[]> {
  return getAllBlogPosts();
}
