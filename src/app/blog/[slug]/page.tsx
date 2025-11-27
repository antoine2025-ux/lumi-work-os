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
  const post = await blogPrisma.blogPost.findUnique({
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
  const { slug } = await params

  // Fetch published post by slug
  const post = await blogPrisma.blogPost.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
    },
  })

  if (!post) {
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

