import { prisma } from '@/lib/db'

export interface WikiPage {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  tags: string[]
  category: string
  createdAt: Date
  updatedAt: Date
}

export interface WikiSearchResult {
  page: WikiPage
  relevanceScore: number
  matchedFields: string[]
}

/**
 * Search wiki pages for relevant content based on a query
 */
export async function searchWikiKnowledge(
  query: string, 
  workspaceId: string = 'cmgl0f0wa00038otlodbw5jhn',
  limit: number = 5
): Promise<WikiSearchResult[]> {
  try {
    const pages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            content: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            excerpt: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              hasSome: [query]
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        tags: true,
        category: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20 // Get more initially for better scoring
    })

    // Calculate relevance scores and match details
    const resultsWithScores = pages.map(page => {
      let score = 0
      const matchedFields: string[] = []
      const queryLower = query.toLowerCase()
      
      // Title match gets highest score
      if (page.title.toLowerCase().includes(queryLower)) {
        score += 3
        matchedFields.push('title')
      }
      
      // Excerpt match gets medium score
      if (page.excerpt?.toLowerCase().includes(queryLower)) {
        score += 2
        matchedFields.push('excerpt')
      }
      
      // Content match gets lower score
      if (page.content.toLowerCase().includes(queryLower)) {
        score += 1
        matchedFields.push('content')
      }
      
      // Tag match gets medium score
      if (page.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 2
        matchedFields.push('tags')
      }

      return {
        page,
        relevanceScore: score,
        matchedFields
      }
    })

    // Sort by relevance score and return top results
    return resultsWithScores
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
  } catch (error) {
    console.error('Error searching wiki knowledge:', error)
    return []
  }
}

/**
 * Get recent wiki pages for context
 */
export async function getRecentWikiPages(
  workspaceId: string = 'cmgl0f0wa00038otlodbw5jhn',
  limit: number = 3
): Promise<WikiPage[]> {
  try {
    const pages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        tags: true,
        category: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    })

    return pages
  } catch (error) {
    console.error('Error fetching recent wiki pages:', error)
    return []
  }
}

/**
 * Get wiki pages by category
 */
export async function getWikiPagesByCategory(
  category: string,
  workspaceId: string = 'cmgl0f0wa00038otlodbw5jhn',
  limit: number = 5
): Promise<WikiPage[]> {
  try {
    const pages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        isPublished: true,
        category
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        tags: true,
        category: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    })

    return pages
  } catch (error) {
    console.error('Error fetching wiki pages by category:', error)
    return []
  }
}

/**
 * Format wiki knowledge for AI context
 */
export function formatWikiKnowledgeForAI(results: WikiSearchResult[]): string {
  if (results.length === 0) {
    return ''
  }

  let context = '\n\nRELEVANT WIKI KNOWLEDGE:\n'
  context += 'Based on your organization\'s existing wiki content, here are relevant pages:\n\n'

  results.forEach((result, index) => {
    const { page, matchedFields } = result
    context += `${index + 1}. **${page.title}** (${page.category})\n`
    context += `   - Matched in: ${matchedFields.join(', ')}\n`
    context += `   - Tags: ${page.tags.join(', ')}\n`
    context += `   - Excerpt: ${page.excerpt || page.content.substring(0, 200)}...\n`
    context += `   - URL: /wiki/${page.slug}\n\n`
  })

  context += 'You can reference this existing knowledge when creating new documents or answering questions.\n'
  context += 'IMPORTANT: When referencing this information, always cite the source by mentioning the page title and providing the URL.\n'
  return context
}
