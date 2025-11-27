import { MetadataRoute } from 'next'
import { blogPrisma } from '@/lib/blog-db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://loopwell.io'
  
  // Fetch published blog posts
  let blogPosts: Array<{ slug: string; updatedAt: Date | null }> = []
  try {
    blogPosts = await blogPrisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/landing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  // Blog post pages
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt || new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages]
}

