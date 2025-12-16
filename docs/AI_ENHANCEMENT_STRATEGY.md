# AI Enhancement Strategy: Combining System Prompt with Workspace Knowledge

## Overview

Currently, the AI assistant uses a hardcoded system prompt to answer questions about Loopwell's capabilities. This document outlines strategies to enhance the AI by combining the system prompt with relevant documentation from the workspace's wiki pages, making responses more accurate, context-aware, and workspace-specific.

## Problem Statement

**Current State:**
- AI answers about Loopwell come solely from the hardcoded system prompt
- Workspace-specific documentation is not utilized
- No way to enhance responses with workspace examples or customizations

**Desired State:**
- AI uses system prompt as authoritative base knowledge
- AI enhances responses with relevant workspace documentation
- AI can cite sources and provide workspace-specific examples
- Responses are more accurate and context-aware

---

## Strategy 1: Hierarchical Knowledge Injection ⭐

### Concept
Build a layered knowledge structure in the prompt with clear source attribution, separating system knowledge from workspace knowledge.

### Implementation Approach

```typescript
// Detection logic
const isLoopwellQuery = (message: string): boolean => {
  const queryLower = message.toLowerCase()
  return queryLower.includes('loopwell') || 
         queryLower.includes('capabilities') ||
         queryLower.includes('features') ||
         queryLower.includes('what is') ||
         queryLower.includes('how does')
}

// Search for relevant pages
const relevantPages = isLoopwellQuery(message)
  ? await searchWikiKnowledge(
      'Loopwell capabilities features overview', 
      workspaceId, 
      5
    )
  : []

// Build workspace knowledge section
const workspaceKnowledge = relevantPages.length > 0 
  ? `\n\nWORKSPACE DOCUMENTATION (from ${workspace.name}):\n` +
    relevantPages.map((result, idx) => 
      `[${idx + 1}] ${result.page.title}\n` +
      `Excerpt: ${result.page.excerpt || result.page.content.substring(0, 300)}...\n` +
      `Source: ${result.page.id}\n`
    ).join('\n---\n')
  : ''
```

### Enhanced System Prompt Structure

```
SYSTEM KNOWLEDGE (Base Definition):
[Hardcoded system prompt about Loopwell]

WORKSPACE KNOWLEDGE BASE (Documentation):
[Relevant pages from workspace that match the query]

COMBINED INSTRUCTION:
- Use SYSTEM KNOWLEDGE as the authoritative base
- Use WORKSPACE KNOWLEDGE to enhance with specific examples, use cases, or customizations
- If workspace knowledge contradicts system knowledge, prefer workspace knowledge (it's more specific)
- Always cite sources when using workspace knowledge
```

### Pros
- ✅ Clear source separation
- ✅ System knowledge remains as base
- ✅ Workspace knowledge enhances it
- ✅ Easy to cite sources

### Cons
- ⚠️ Requires keyword detection for when to search
- ⚠️ May add token overhead

---

## Strategy 2: Semantic Query Expansion

### Concept
Expand the user query to search for related concepts, then inject relevant context from multiple angles.

### Implementation Approach

```typescript
// Query expansion
const queryExpansions = [
  'Loopwell',
  'Loopwell capabilities',
  'Loopwell features',
  'Loopwell overview',
  'workspace features',
  'AI assistant',
  'wiki pages projects tasks'
]

// Search for pages matching any expansion
const allResults = await Promise.all(
  queryExpansions.map(q => searchWikiKnowledge(q, workspaceId, 3))
)

// Deduplicate and rank results
const uniqueResults = deduplicateResults(allResults)
const rankedResults = rankByRelevance(uniqueResults, message)
```

### Enhanced System Prompt

```
You have access to:
1. SYSTEM KNOWLEDGE: The base definition of Loopwell (below)
2. WORKSPACE KNOWLEDGE: Documentation from this workspace (below)

When answering:
- Start with system knowledge for base understanding
- Enhance with workspace-specific examples, workflows, or customizations
- If workspace has specific documentation about a feature, prioritize that
- Use citations: [System] for system knowledge, [Page: Title] for workspace docs
```

### Pros
- ✅ Finds more relevant pages
- ✅ Better coverage of related concepts
- ✅ More context-aware

### Cons
- ⚠️ More database queries
- ⚠️ Higher token usage
- ⚠️ Need deduplication logic

---

## Strategy 3: Two-Stage RAG (Retrieval-Augmented Generation)

### Concept
1. First pass: Use system prompt to understand intent
2. Second pass: Retrieve relevant pages based on intent
3. Final: Combine both in enhanced prompt

### Implementation Approach

```typescript
// Stage 1: Quick intent detection (lightweight)
const intentPrompt = `Based on this query: "${message}", determine:
1. Is this about Loopwell's general capabilities? (yes/no)
2. What specific topics might be relevant? (list keywords)
3. Should we search workspace documentation? (yes/no)

Return JSON: {aboutLoopwell: boolean, topics: string[], searchNeeded: boolean}`

const intentAnalysis = await generateAIResponse(intentPrompt, 'gpt-4o-mini', {...})

// Stage 2: If search needed, retrieve relevant pages
if (intentAnalysis.searchNeeded) {
  const searchQueries = [
    message,
    ...intentAnalysis.topics,
    'Loopwell capabilities'
  ]
  // Search with all queries
}

// Stage 3: Build enhanced prompt with both sources
```

### Pros
- ✅ More efficient (only searches when needed)
- ✅ Smarter retrieval (query-driven)
- ✅ Better token usage

### Cons
- ⚠️ More complex (3 API calls)
- ⚠️ Higher latency
- ⚠️ Requires intent parsing

---

## Strategy 4: Smart Context Injection with Relevance Scoring ⭐

### Concept
Always include workspace knowledge, but score and prioritize it based on multiple factors.

### Implementation Approach

```typescript
// Enhanced context building
const buildEnhancedContext = async (
  message: string, 
  workspaceId: string
) => {
  // Extract key terms from message
  const keyTerms = extractKeyTerms(message) // ["Loopwell", "capabilities", "summary"]
  
  // Multi-query search
  const searchResults = await Promise.all(
    keyTerms.map(term => searchWikiKnowledge(term, workspaceId, 5))
  )
  
  // Dedupe and score by:
  // - Title match score (from searchWikiKnowledge)
  // - Recency (updatedAt)
  // - Content length (more comprehensive = better)
  // - Tags (has "loopwell", "documentation", "features" = higher)
  
  const scoredPages = scoreAndRankPages(searchResults, message)
  
  // Take top 3-5 most relevant
  return scoredPages.slice(0, 5)
}

// Scoring algorithm
interface PageScore {
  page: WikiPage
  score: number
  reasons: string[]
}

function scoreAndRankPages(
  results: WikiSearchResult[], 
  query: string
): PageScore[] {
  return results.map(result => {
    let score = result.relevanceScore || 0
    
    // Recency bonus (pages updated in last 30 days)
    const daysSinceUpdate = daysBetween(new Date(), result.page.updatedAt)
    if (daysSinceUpdate < 30) score += 1
    if (daysSinceUpdate < 7) score += 0.5
    
    // Content length bonus (comprehensive docs score higher)
    const contentLength = result.page.content?.length || 0
    if (contentLength > 1000) score += 0.5
    if (contentLength > 5000) score += 1
    
    // Tag bonus (documentation tags)
    const docTags = ['loopwell', 'documentation', 'features', 'capabilities', 'overview']
    const hasDocTag = result.page.tags?.some(tag => 
      docTags.includes(tag.toLowerCase())
    )
    if (hasDocTag) score += 1
    
    return {
      page: result.page,
      score,
      reasons: [
        `Relevance: ${result.relevanceScore}`,
        `Updated: ${daysSinceUpdate} days ago`,
        `Content length: ${contentLength} chars`
      ]
    }
  }).sort((a, b) => b.score - a.score)
}
```

### Enhanced System Prompt Structure

```typescript
const workspaceDocsSection = relevantPages.length > 0
  ? `\n\n=== WORKSPACE DOCUMENTATION ===\n` +
    `The following pages from this workspace may contain relevant information:\n\n` +
    relevantPages.map((page, idx) => 
      `${idx + 1}. **${page.title}** (relevance: ${page.score})\n` +
      `   ${page.excerpt || page.content.substring(0, 200)}...\n` +
      `   [ID: ${page.id}]\n`
    ).join('\n') +
    `\n=== END WORKSPACE DOCUMENTATION ===\n\n` +
    `INSTRUCTION: When answering, you can reference these pages with [Page: Title]. ` +
    `If workspace documentation provides more specific or detailed information than ` +
    `the system knowledge, prefer the workspace documentation for that specific topic.`
  : ''
```

### Pros
- ✅ Always includes relevant context
- ✅ Quality over quantity (top results only)
- ✅ Clear relevance scoring

### Cons
- ⚠️ More processing upfront
- ⚠️ Need good scoring algorithm

---

## Strategy 5: Template-Based Prompt Construction

### Concept
Different prompt templates based on query type, each optimized for its use case.

### Implementation Approach

```typescript
interface PromptTemplate {
  systemIntro: string
  knowledgeBase: boolean
  searchTerms: string[]
  instruction: string
}

const promptTemplates: Record<string, PromptTemplate> = {
  'loopwell_question': {
    systemIntro: `You are Loopwell's Contextual Spaces AI.`,
    knowledgeBase: true, // Always include workspace docs
    searchTerms: ['Loopwell', 'capabilities', 'features', 'overview'],
    instruction: `Use system knowledge as base, enhance with workspace documentation.`
  },
  'workspace_specific': {
    systemIntro: `You are helping with workspace content.`,
    knowledgeBase: true,
    searchTerms: [extractedFromQuery],
    instruction: `Search workspace first, use system knowledge for context.`
  },
  'general_chat': {
    systemIntro: `You are Loopwell's AI assistant.`,
    knowledgeBase: false,
    instruction: `Use system knowledge, no workspace search needed.`
  }
}

// Detect query type and use appropriate template
function detectQueryType(message: string): string {
  const lower = message.toLowerCase()
  
  if (lower.includes('loopwell') || lower.includes('capabilities')) {
    return 'loopwell_question'
  }
  if (lower.includes('workspace') || lower.includes('page') || lower.includes('project')) {
    return 'workspace_specific'
  }
  return 'general_chat'
}
```

---

## Recommended Hybrid Approach ⭐⭐⭐

**Combination of Strategy 1 (Hierarchical) + Strategy 4 (Scoring)**

### Why This Combination?

1. **Clear hierarchy** (Strategy 1): System knowledge as base, workspace as enhancement
2. **Smart retrieval** (Strategy 4): Quality scoring ensures only relevant pages included
3. **Token efficient**: Only top 3-5 pages, not all matches
4. **Citation-ready**: Clear source attribution built-in

### Implementation Flow

```typescript
// Step 1: Detect if query is about Loopwell/capabilities
function detectLoopwellQuery(message: string): boolean {
  const queryLower = message.toLowerCase()
  const loopwellIndicators = [
    'loopwell', 'capabilities', 'features', 'overview', 
    'what is', 'how does', 'what can'
  ]
  return loopwellIndicators.some(indicator => queryLower.includes(indicator))
}

// Step 2: If yes, search workspace with smart terms
async function searchAndRankPages(
  message: string,
  workspaceId: string,
  options: {
    searchTerms?: string[]
    maxResults?: number
    minRelevanceScore?: number
  }
): Promise<PageScore[]> {
  const { 
    searchTerms = ['Loopwell', 'capabilities', 'features', 'overview'],
    maxResults = 5,
    minRelevanceScore = 2
  } = options

  // Multi-query search
  const allResults = await Promise.all(
    searchTerms.map(term => 
      searchWikiKnowledge(term, workspaceId, 10)
    )
  )

  // Flatten and deduplicate
  const uniquePages = new Map<string, WikiSearchResult>()
  allResults.flat().forEach(result => {
    const existing = uniquePages.get(result.page.id)
    if (!existing || (result.relevanceScore > (existing.relevanceScore || 0))) {
      uniquePages.set(result.page.id, result)
    }
  })

  // Score and rank
  const scoredPages = scoreAndRankPages(
    Array.from(uniquePages.values()), 
    message
  )

  // Filter by minimum score and limit results
  return scoredPages
    .filter(p => p.score >= minRelevanceScore)
    .slice(0, maxResults)
}

// Step 3: Build enhanced system prompt
function buildWorkspaceKnowledgeSection(
  pages: PageScore[],
  workspaceName: string
): string {
  if (pages.length === 0) return ''

  return `
=== WORKSPACE DOCUMENTATION (from ${workspaceName}) ===
The following pages from this workspace contain relevant information about Loopwell:

${pages.map((page, idx) => 
  `${idx + 1}. **${page.page.title}** (relevance score: ${page.score.toFixed(1)})
   Excerpt: ${page.page.excerpt || page.page.content.substring(0, 250)}...
   Source ID: ${page.page.id}
   Tags: ${page.page.tags?.join(', ') || 'none'}
`
).join('\n---\n')}

=== END WORKSPACE DOCUMENTATION ===

INSTRUCTION FOR AI:
- Use SYSTEM KNOWLEDGE (below) as the authoritative base definition of Loopwell
- Use WORKSPACE DOCUMENTATION (above) to enhance your response with:
  * Specific examples from this workspace
  * Custom workflows or use cases
  * Workspace-specific terminology or features
- If workspace documentation provides more detailed or specific information than system knowledge, prioritize the workspace documentation for that topic
- Always cite sources:
  * Use [System] when referencing base system knowledge
  * Use [Page: ${pages.map(p => p.page.title).join(', ')}] when referencing workspace documentation
- If workspace documentation contradicts system knowledge, prefer workspace documentation (it's customized for this workspace)
`
}

// Step 4: Integrate into existing route
// In src/app/api/ai/chat/route.ts, before building system prompt:

const isLoopwellQuery = detectLoopwellQuery(message)
const relevantPages = isLoopwellQuery
  ? await searchAndRankPages(message, workspaceId, {
      searchTerms: ['Loopwell', 'capabilities', 'features', 'overview'],
      maxResults: 5,
      minRelevanceScore: 2
    })
  : []

const workspaceKnowledgeSection = buildWorkspaceKnowledgeSection(
  relevantPages,
  workspace?.name || 'this workspace'
)

// Append to system prompt
const enhancedSystemPrompt = systemPrompt + workspaceKnowledgeSection
```

### Key Prompt Engineering Principles

1. **Source Attribution**: Always mark where information comes from
   - `[System]` for base system knowledge
   - `[Page: Title]` for workspace documentation

2. **Knowledge Hierarchy**: 
   - System knowledge = authoritative base
   - Workspace knowledge = enhancement/specifics

3. **Conflict Resolution**: 
   - Workspace docs override system for workspace-specific topics
   - System knowledge remains authoritative for general concepts

4. **Citation Format**: 
   - Clear, consistent citation format
   - Easy to parse and display to users

5. **Token Efficiency**: 
   - Limit to top 3-5 most relevant pages
   - Use excerpts, not full content
   - Score-based filtering

---

## Technical Implementation Details

### Files to Modify

1. **`src/app/api/ai/chat/route.ts`**
   - Add query detection logic
   - Add workspace page search integration
   - Enhance system prompt building

2. **`src/lib/wiki-knowledge.ts`** (already exists)
   - Enhance `searchWikiKnowledge` function
   - Add `scoreAndRankPages` function
   - Add `deduplicateResults` function

3. **New utility file: `src/lib/ai/context-enhancer.ts`**
   - `detectLoopwellQuery(message: string): boolean`
   - `searchAndRankPages(...)`
   - `buildWorkspaceKnowledgeSection(...)`
   - `scoreAndRankPages(...)`

### Database Considerations

- No schema changes needed
- Uses existing `wikiPage` table
- Leverages existing search functionality
- Consider caching search results for performance

### Performance Optimizations

1. **Caching**: Cache search results for common queries
2. **Parallel Queries**: Search multiple terms in parallel
3. **Limit Results**: Max 5 pages to control token usage
4. **Lazy Loading**: Only search when query matches certain patterns

### Token Usage Impact

- Current: ~2000 tokens (system prompt)
- Enhanced: ~2500-3000 tokens (system + 3-5 page excerpts)
- Mitigation: 
  - Limit excerpt length (250 chars)
  - Top 5 results max
  - Score-based filtering

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `src/lib/ai/context-enhancer.ts` utility file
- [ ] Implement `detectLoopwellQuery()` function
- [ ] Enhance `searchWikiKnowledge()` to support multiple queries
- [ ] Implement `scoreAndRankPages()` function
- [ ] Implement `deduplicateResults()` function

### Phase 2: Integration
- [ ] Integrate query detection into `/api/ai/chat` route
- [ ] Add workspace knowledge search before building system prompt
- [ ] Build `buildWorkspaceKnowledgeSection()` function
- [ ] Append workspace knowledge to system prompt

### Phase 3: Testing
- [ ] Test with query: "What are Loopwell's capabilities?"
- [ ] Test with query: "Summarize what Loopwell does"
- [ ] Test with workspace that has Loopwell documentation pages
- [ ] Test with workspace that has no relevant pages
- [ ] Verify citations are correct
- [ ] Verify token usage is acceptable

### Phase 4: Optimization
- [ ] Add caching for search results
- [ ] Optimize scoring algorithm
- [ ] Add performance monitoring
- [ ] Fine-tune relevance thresholds

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Add examples of enhanced responses
- [ ] Document citation format

---

## Example Enhanced Response

**User Query:**
> "Can you give me a brief summary of what Loopwell capabilities are?"

**Before (System Prompt Only):**
```
Loopwell is designed to enhance team collaboration within a workspace...
```

**After (System + Workspace Knowledge):**
```
Loopwell is designed to enhance team collaboration within a workspace. [System]

Based on documentation in this workspace [Page: Loopwell Overview, Getting Started Guide]:
- This workspace uses Loopwell for project management with custom workflows
- Team has implemented AI-powered task extraction
- Custom wiki templates for meeting notes
...

[System] - Base system knowledge
[Page: Loopwell Overview] - Workspace-specific documentation
```

---

## Future Enhancements

1. **Vector Embeddings**: Use semantic search instead of keyword matching
2. **Learning**: Track which pages are most useful for certain queries
3. **User Feedback**: Allow users to rate response quality and sources
4. **Multi-Workspace**: Support cross-workspace knowledge sharing
5. **Real-time Updates**: Refresh knowledge when pages are updated

---

## Notes

- This strategy maintains backward compatibility (works even if no workspace docs exist)
- System prompt remains authoritative for general concepts
- Workspace knowledge enhances but doesn't replace system knowledge
- Citations make it clear where information comes from
- Token usage is controlled through smart filtering and limits

