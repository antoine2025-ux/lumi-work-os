import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getBlogPost, getAllBlogPosts } from "@/lib/blog";
import { Logo } from "@/components/logo";
import { MarkdownContent } from "@/components/blog/markdown-content";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  
  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

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

      {/* Article */}
      <article className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Post Header */}
          <header className="mb-16">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-slate-800 text-slate-300"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
              {post.title}
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              {post.excerpt}
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-400 mb-12">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              {post.readingTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              )}
              <div className="text-slate-500">
                By {post.author.name}
              </div>
            </div>
          </header>

          {/* Post Content */}
          <div className="mb-16">
            <MarkdownContent content={post.content} />
          </div>

          {/* Back to Blog */}
          <div className="mt-16 pt-8 border-t border-slate-700">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
      </article>

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

