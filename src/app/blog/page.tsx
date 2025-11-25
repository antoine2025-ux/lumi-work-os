import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllBlogPosts } from "@/lib/blog";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Blog | Loopwell",
  description: "Insights, updates, and stories from the Loopwell team",
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/landing" className="flex items-center space-x-2">
              <Logo 
                width={32} 
                height={32} 
                className="w-8 h-8"
                variant="dark"
              />
              <span className="text-xl font-bold text-white">Loopwell</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/landing" className="text-slate-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">
                Blog
              </Link>
              <Link href="/landing#become-a-tester" className="text-slate-300 hover:text-white transition-colors">
                Join Waitlist
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Loopwell Blog
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Insights, updates, and stories about building better workplaces
            </p>
          </div>

          {/* Blog Posts Grid */}
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-blue-500/10"
                >
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-slate-700 text-slate-300 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-slate-400 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    {post.readingTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{post.readingTime} min</span>
                      </div>
                    )}
                  </div>

                  {/* Read More Indicator */}
                  <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                    Read more
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              &copy; 2025 Loopwell. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/landing" className="text-slate-400 hover:text-white transition-colors text-sm">
                Home
              </Link>
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors text-sm">
                Blog
              </Link>
              <Link href="/landing#become-a-tester" className="text-slate-400 hover:text-white transition-colors text-sm">
                Join Waitlist
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

