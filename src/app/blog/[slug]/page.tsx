import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, BookOpen } from "lucide-react"
import { blogPrisma } from "@/lib/blog-db"
import { notFound } from "next/navigation"

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic'

/**
 * Sanitize HTML content to prevent XSS and script execution
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
  
  // Remove javascript: protocol in href/src
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Remove iframe tags (security risk)
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  
  return sanitized
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await blogPrisma.blogPost.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
  })

  if (!post) {
    return {
      title: "Post Not Found",
    }
  }

  return {
    title: `${post.title} | Blog | Loopwell`,
    description: post.excerpt,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  let slug: string
  try {
    const resolvedParams = await params
    slug = resolvedParams.slug
    console.log("[Blog Post Page] Resolved slug:", slug)
  } catch (error) {
    console.error("[Blog Post Page] Error resolving params:", error)
    notFound()
  }

  console.log("[Blog Post Page] Fetching post with slug:", slug)

  // Fetch published post by slug
  // Note: findUnique only works with unique fields, so we use findFirst instead
  let post
  try {
    // First, try to find by slug only (to see if post exists)
    const postBySlug = await blogPrisma.blogPost.findUnique({
      where: { slug },
    })
    console.log("[Blog Post Page] Post by slug only:", postBySlug ? { id: postBySlug.id, title: postBySlug.title, status: postBySlug.status } : "null")
    
    // Then find published post
    post = await blogPrisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
    })
    console.log("[Blog Post Page] Published post found:", post ? { id: post.id, title: post.title } : "null")
  } catch (error) {
    console.error("[Blog Post Page] Database error:", error)
    console.error("[Blog Post Page] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Don't throw - let the notFound() handle it below
    post = null
  }

  // If not found, try to find any post with this slug (for debugging)
  if (!post) {
    console.log("[Blog Post Page] Published post not found, checking all posts with this slug...")
    const anyPost = await blogPrisma.blogPost.findUnique({
      where: { slug },
    })
    if (anyPost) {
      console.log("[Blog Post Page] Found post but status is:", anyPost.status)
    } else {
      console.log("[Blog Post Page] No post found with slug:", slug)
      // List all slugs for debugging
      const allPosts = await blogPrisma.blogPost.findMany({
        select: { slug: true, status: true, title: true },
      })
      console.log("[Blog Post Page] All posts in database:", allPosts)
    }
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/blog">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <article>
          {/* Article Header */}
          <header className="mb-12">
            <div className="mb-6">
              <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-400">
                <BookOpen className="w-3 h-3 mr-1" />
                Blog Post
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>
            {post.publishedAt && (
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.publishedAt.toISOString()}>
                    {post.publishedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <div className="h-4 w-px bg-slate-600"></div>
                <div className="text-sm">
                  {Math.ceil(post.content.split(' ').length / 200)} min read
                </div>
              </div>
            )}
          </header>

          {/* Article Content */}
          <Card className="shadow-xl bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 md:p-12">
              <div
                className="blog-content text-slate-300 prose prose-invert prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
              />
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-700">
            <Link href="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                <BookOpen className="w-4 h-4 mr-2" />
                More Posts
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}

