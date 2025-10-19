// AI Integration Hooks for Wiki System
"use client"

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

// AI Content Analysis Hook
export function useAIContentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const analyzeContent = useCallback(async (content: string, pageId?: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          pageId,
          type: 'wiki_page'
        })
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result)
      
      logger.info('Content analysis completed', { pageId, analysisType: result.type })
      return result
    } catch (error) {
      logger.error('Content analysis failed', { pageId }, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return {
    analyzeContent,
    isAnalyzing,
    analysis
  }
}

// AI Auto-tagging Hook
export function useAIAutoTagging() {
  const [isTagging, setIsTagging] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  const generateTags = useCallback(async (content: string, title: string) => {
    setIsTagging(true)
    try {
      const response = await fetch('/api/ai/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          title,
          type: 'wiki_page'
        })
      })

      if (!response.ok) {
        throw new Error('Tag generation failed')
      }

      const result = await response.json()
      setSuggestedTags(result.tags || [])
      
      logger.info('Tags generated', { tagCount: result.tags?.length })
      return result.tags || []
    } catch (error) {
      logger.error('Tag generation failed', {}, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsTagging(false)
    }
  }, [])

  return {
    generateTags,
    isTagging,
    suggestedTags
  }
}

// AI Content Generation Hook
export function useAIContentGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string>('')

  const generateContent = useCallback(async (prompt: string, context?: string, format: 'markdown' | 'html' = 'html') => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
          format,
          type: 'wiki_content'
        })
      })

      if (!response.ok) {
        throw new Error('Content generation failed')
      }

      const result = await response.json()
      setGeneratedContent(result.content || '')
      
      logger.info('Content generated', { contentLength: result.content?.length })
      return result.content || ''
    } catch (error) {
      logger.error('Content generation failed', {}, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateContent,
    isGenerating,
    generatedContent
  }
}

// AI Search Enhancement Hook
export function useAISearchEnhancement() {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancedResults, setEnhancedResults] = useState<any[]>([])

  const enhanceSearch = useCallback(async (query: string, workspaceId: string) => {
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/ai/enhance-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          workspaceId,
          type: 'wiki_search'
        })
      })

      if (!response.ok) {
        throw new Error('Search enhancement failed')
      }

      const result = await response.json()
      setEnhancedResults(result.results || [])
      
      logger.info('Search enhanced', { resultCount: result.results?.length })
      return result.results || []
    } catch (error) {
      logger.error('Search enhancement failed', {}, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsEnhancing(false)
    }
  }, [])

  return {
    enhanceSearch,
    isEnhancing,
    enhancedResults
  }
}

// AI Content Suggestions Hook
export function useAIContentSuggestions() {
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])

  const getSuggestions = useCallback(async (content: string, pageId?: string) => {
    setIsSuggesting(true)
    try {
      const response = await fetch('/api/ai/content-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          pageId,
          type: 'wiki_suggestions'
        })
      })

      if (!response.ok) {
        throw new Error('Suggestion generation failed')
      }

      const result = await response.json()
      setSuggestions(result.suggestions || [])
      
      logger.info('Content suggestions generated', { suggestionCount: result.suggestions?.length })
      return result.suggestions || []
    } catch (error) {
      logger.error('Suggestion generation failed', {}, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsSuggesting(false)
    }
  }, [])

  return {
    getSuggestions,
    isSuggesting,
    suggestions
  }
}

// AI Content Quality Check Hook
export function useAIContentQuality() {
  const [isChecking, setIsChecking] = useState(false)
  const [qualityReport, setQualityReport] = useState<any>(null)

  const checkQuality = useCallback(async (content: string, pageId?: string) => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/ai/check-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          pageId,
          type: 'wiki_quality'
        })
      })

      if (!response.ok) {
        throw new Error('Quality check failed')
      }

      const result = await response.json()
      setQualityReport(result)
      
      logger.info('Content quality checked', { score: result.score })
      return result
    } catch (error) {
      logger.error('Quality check failed', {}, error instanceof Error ? error : undefined)
      throw error
    } finally {
      setIsChecking(false)
    }
  }, [])

  return {
    checkQuality,
    isChecking,
    qualityReport
  }
}

// Combined AI Hook for comprehensive wiki assistance
export function useWikiAI() {
  const contentAnalysis = useAIContentAnalysis()
  const autoTagging = useAIAutoTagging()
  const contentGeneration = useAIContentGeneration()
  const searchEnhancement = useAISearchEnhancement()
  const contentSuggestions = useAIContentSuggestions()
  const contentQuality = useAIContentQuality()

  const isAnyLoading = 
    contentAnalysis.isAnalyzing ||
    autoTagging.isTagging ||
    contentGeneration.isGenerating ||
    searchEnhancement.isEnhancing ||
    contentSuggestions.isSuggesting ||
    contentQuality.isChecking

  return {
    // Individual hooks
    contentAnalysis,
    autoTagging,
    contentGeneration,
    searchEnhancement,
    contentSuggestions,
    contentQuality,
    
    // Combined state
    isAnyLoading,
    
    // Convenience methods
    analyzePage: async (content: string, pageId: string) => {
      const [analysis, tags, suggestions, quality] = await Promise.all([
        contentAnalysis.analyzeContent(content, pageId),
        autoTagging.generateTags(content, ''),
        contentSuggestions.getSuggestions(content, pageId),
        contentQuality.checkQuality(content, pageId)
      ])
      
      return {
        analysis,
        tags,
        suggestions,
        quality
      }
    }
  }
}
