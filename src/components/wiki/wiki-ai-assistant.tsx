"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AILogo } from "@/components/ai-logo"
import { 
  Sparkles, 
  Send, 
  X, 
  Minus,
  Maximize2,
  Mic,
  Loader2,
  FileText,
  Sidebar,
  Move,
  FileEdit,
  Paperclip,
  Globe,
  AtSign,
  Languages,
  Search,
  CheckSquare,
  Lightbulb,
  Plus
} from "lucide-react"
import { AIPreviewCard } from "./ai-preview-card"
import { AIWorkspaceSelectDialog } from "./ai-workspace-select-dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WikiWorkspace {
  id: string
  name: string
  description?: string
  type: 'personal' | 'team' | 'project'
  color?: string
  icon?: string
}

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
  permissionLevel?: string
  workspace_type?: string
}

interface WikiAIAssistantProps {
  onContentUpdate?: (content: string) => void
  onTitleUpdate?: (title: string) => void
  onCreatePage?: (title: string, content: string, workspaceId: string) => Promise<void> // Updated to accept params
  onStartCreatingPage?: () => void // Callback to show page creation UI
  workspaces?: WikiWorkspace[] // Workspaces for selection
  recentPages?: RecentPage[] // Recent pages for parent page suggestions
  currentContent?: string
  currentTitle?: string
  currentPageId?: string
  selectedText?: string
  onOpenChange?: (isOpen: boolean) => void
  onDisplayModeChange?: (mode: 'sidebar' | 'floating') => void
  mode?: 'bottom-bar' | 'floating-button' // 'bottom-bar' for wiki pages, 'floating-button' for other pages
}

interface LoopwellAIResponse {
  intent: 'answer' | 'summarize' | 'improve_existing_page' | 'append_to_page' | 'create_new_page' | 'extract_tasks' | 'find_things' | 'tag_pages' | 'do_nothing'
  confidence: number
  rationale: string
  citations: Array<{ title: string; id: string }>
  preview: {
    title?: string
    markdown?: string
    diff?: string
    tasks?: Array<{
      title: string
      description: string
      assignee_suggestion?: string
      due_suggestion?: string
      labels: string[]
    }>
    tags?: string[]
  }
  next_steps: Array<'ask_clarifying_question' | 'insert' | 'replace_section' | 'create_page' | 'create_tasks'>
}

/**
 * Clean markdown content by removing code block wrappers and quotes
 * Ensures raw markdown is returned for direct insertion into editor
 */
function cleanMarkdownContent(markdown: string): string {
  if (!markdown) return ''
  
  let cleaned = markdown.trim()
  
  // Remove markdown code blocks (```markdown ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:markdown)?\s*\n?([\s\S]*?)\n?```$/gm, '$1')
  
  // Remove any remaining code block markers at start/end
  cleaned = cleaned.replace(/^```[a-z]*\s*\n?/gm, '')
  cleaned = cleaned.replace(/\n?```$/gm, '')
  
  // Remove block quotes if wrapping entire content
  if (cleaned.startsWith('> ')) {
    cleaned = cleaned.split('\n').map(line => {
      if (line.startsWith('> ')) {
        return line.substring(2)
      }
      return line
    }).join('\n')
  }
  
  return cleaned.trim()
}

export function WikiAIAssistant({ 
  onContentUpdate, 
  onTitleUpdate,
  onCreatePage,
  onStartCreatingPage,
  workspaces = [],
  recentPages = [],
  currentContent = '', 
  currentTitle = 'New page',
  currentPageId,
  selectedText,
  onOpenChange,
  onDisplayModeChange,
  mode = 'bottom-bar' // Default to bottom-bar for wiki pages
}: WikiAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Debug: Log when workspaces change
  useEffect(() => {
    console.log('📦 WikiAIAssistant - Workspaces updated:', workspaces.length, workspaces.map(w => w.name))
    console.log('📦 WikiAIAssistant - Recent pages updated:', recentPages.length, recentPages.map(p => p.title))
  }, [workspaces, recentPages])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  // Default display mode based on component mode
  const [displayMode, setDisplayMode] = useState<'sidebar' | 'floating'>(mode === 'floating-button' ? 'floating' : 'sidebar')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingPreview, setPendingPreview] = useState<LoopwellAIResponse | null>(null)
  const [showWorkspaceSelectDialog, setShowWorkspaceSelectDialog] = useState(false)
  const [pendingPageTitle, setPendingPageTitle] = useState("")
  const [pendingPageContent, setPendingPageContent] = useState("")
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  // Page creation flow state
  const [pageCreationState, setPageCreationState] = useState<'idle' | 'waiting_for_title' | 'waiting_for_location'>('idle')
  const [pendingPageLocation, setPendingPageLocation] = useState<{ type: 'workspace' | 'parent', id: string, name: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleNewChat = () => {
    // Clear messages
    setMessages([])
    // Reset session ID to create a new session
    setSessionId(null)
    // Clear pending preview
    setPendingPreview(null)
    // Reset page creation flow
    setPageCreationState('idle')
    setPendingPageTitle("")
    setPendingPageLocation(null)
    // Clear input
    setInput("")
    // Focus input if open
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Stream content generation for a page
  const streamContentToPage = async (pageId: string, prompt: string, initialContent?: string) => {
    try {
      // Get workspace ID - try to get from user status or use first workspace
      let workspaceId = ''
      try {
        const statusResponse = await fetch('/api/auth/user-status')
        if (statusResponse.ok) {
          const userStatus = await statusResponse.json()
          workspaceId = userStatus.workspaceId || ''
        }
      } catch (e) {
        console.warn('Could not fetch workspace ID:', e)
      }
      
      if (!workspaceId && workspaces.length > 0) {
        workspaceId = workspaces[0].id
      }
      
      const response = await fetch('/api/ai/draft-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          prompt,
          workspaceId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let accumulatedContent = initialContent || ''

      // Add streaming status message
      const streamingMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Drafting content...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, streamingMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }

              if (data.content) {
                accumulatedContent += data.content
                // Update page content in real-time as chunks arrive
                if (onContentUpdate) {
                  onContentUpdate(accumulatedContent)
                }
              }

              if (data.done) {
                // Update streaming message
                setMessages(prev => prev.map(msg => 
                  msg.id === streamingMessage.id
                    ? { ...msg, content: 'Content drafted successfully!' }
                    : msg
                ))
                return
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                console.error('Error parsing stream data:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming page content:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to stream content'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])


  // Create or get session ID
  useEffect(() => {
    if (!sessionId && isOpen) {
      const createSession = async () => {
        try {
          const response = await fetch('/api/ai/chat-sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo',
              title: currentTitle || 'Wiki Chat'
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setSessionId(data.sessionId)
          }
        } catch (error) {
          console.error('Failed to create chat session:', error)
        }
      }
      createSession()
    }
  }, [isOpen, sessionId, currentTitle])

  // Helper function to extract title from user input
  const extractTitle = (input: string): string => {
    let cleaned = input.trim()
    
    // First, try to extract text within quotes (most reliable)
    const quotedMatch = cleaned.match(/['"]([^'"]+)['"]/)
    if (quotedMatch) {
      return quotedMatch[1].trim()
    }
    
    // Remove common leading phrases (case insensitive)
    cleaned = cleaned
      .replace(/^(it should be called|call it|title is|titled|name it|name is|the title should be|the page should be called|it's called|it is called)\s*/i, '')
      .trim()
    
    // Remove leading/trailing quotes if still present
    cleaned = cleaned.replace(/^['"]+|['"]+$/g, '')
    
    // Remove leading articles
    cleaned = cleaned.replace(/^(the|a|an)\s+/i, '')
    
    // If the cleaned result is empty or too short, return original (minus quotes)
    if (cleaned.length < 2) {
      return input.replace(/^['"]+|['"]+$/g, '').trim()
    }
    
    return cleaned.trim()
  }

  // Helper function to extract entity name from input (removes words like "under", "in", "the", etc.)
  const extractEntityName = (input: string): string => {
    let cleaned = input.trim()
    
    // Remove quotes first if present
    cleaned = cleaned.replace(/^['"]+|['"]+$/g, '')
    
    // Remove common location phrases at the start
    cleaned = cleaned
      .replace(/^(under|in|at|within|inside|into)\s+/i, '')
      .trim()
    
    // Remove "the" after location words (e.g., "under the Loopwell Space" -> "Loopwell Space")
    cleaned = cleaned.replace(/^(the)\s+/i, '')
    
    // Remove location phrases at the end
    cleaned = cleaned.replace(/\s+(under|in|at|within|inside|into)$/i, '')
    
    // Remove remaining articles
    cleaned = cleaned.replace(/^(the|a|an)\s+/i, '')
    
    return cleaned.trim()
  }

  // Helper function to check if a workspace/page name matches the input (partial matching)
  const nameMatches = (entityName: string, input: string): boolean => {
    const entityLower = entityName.toLowerCase().trim()
    const inputLower = input.toLowerCase().trim()
    
    // Exact match
    if (inputLower === entityLower) return true
    
    // Input contains full entity name
    if (inputLower.includes(entityLower)) return true
    
    // Entity name contains input (for partial matches)
    if (entityLower.includes(inputLower)) return true
    
    // Handle typos: check if input is very similar to entity (e.g., "loopwel" vs "loopwell")
    // Remove common typos: check if removing one character makes them match
    if (Math.abs(inputLower.length - entityLower.length) <= 1) {
      // Check if input matches entity when ignoring one character
      const inputChars = inputLower.split('')
      const entityChars = entityLower.split('')
      
      // If lengths are equal, check if they're very similar (1 char difference)
      if (inputLower.length === entityLower.length) {
        let differences = 0
        for (let i = 0; i < inputChars.length; i++) {
          if (inputChars[i] !== entityChars[i]) differences++
        }
        if (differences <= 1) return true
      }
    }
    
    // Word-by-word matching - check if all significant words from entity appear in input
    const entityWords = entityLower.split(/\s+/).filter(w => w.length > 2)
    const inputWords = inputLower.split(/\s+/).filter(w => w.length > 2)
    
    if (entityWords.length > 0) {
      // Check if all entity words appear in input
      const allEntityWordsInInput = entityWords.every(word => 
        inputWords.some(inputWord => inputWord.includes(word) || word.includes(inputWord))
      )
      if (allEntityWordsInInput) return true
      
      // Check if all input words appear in entity
      if (inputWords.length > 0) {
        const allInputWordsInEntity = inputWords.every(inputWord =>
          entityWords.some(word => word.includes(inputWord) || inputWord.includes(inputWord))
        )
        if (allInputWordsInEntity) return true
      }
    }
    
    return false
  }

  // Helper function to parse location from user input (with explicit workspaces parameter)
  const parseLocationWithWorkspaces = (
    input: string, 
    workspaceList: WikiWorkspace[], 
    pageList: RecentPage[]
  ): { type: 'workspace' | 'parent', id: string, name: string } | null => {
    const lowerInput = input.toLowerCase().trim()
    
    console.log('🔍 Parsing location - Input:', input)
    console.log('🔍 Available workspaces:', workspaceList.map(w => ({ name: w.name, id: w.id })))
    console.log('🔍 Available pages:', pageList.map(p => ({ title: p.title, id: p.id })))
    
    // Extract the entity name from input (removes "under", "in", "the", etc.)
    const extractedName = extractEntityName(input)
    console.log('🔍 Extracted entity name:', extractedName)
    
    // FIRST: Check for workspace matches - match against extracted name AND variations
    // Sort workspaces by relevance (exact matches first, then partial)
    const workspaceMatches: Array<{ workspace: WikiWorkspace, score: number, matchType: string }> = []
    
    // Extract significant words from input (words longer than 3 chars)
    const extractedWords = extractedName.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const inputWords = input.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    
    for (const workspace of workspaceList) {
      const workspaceName = workspace.name
      const workspaceNameLower = workspaceName.toLowerCase()
      const workspaceWords = workspaceNameLower.split(/\s+/)
      const extractedLower = extractedName.toLowerCase()
      const inputLower = input.toLowerCase()
      
      let score = 0
      let matchType = 'none'
      
      // EXACT MATCH (highest priority)
      if (workspaceNameLower === extractedLower || workspaceNameLower === inputLower) {
        score = 100
        matchType = 'exact'
        console.log('🎯 EXACT match found:', workspace.name, 'with', extractedName)
      }
      // Workspace name contains extracted name (e.g., "Loopwell Space" contains "loopwell")
      else if (workspaceNameLower.includes(extractedLower) && extractedLower.length >= 4) {
        score = 80
        matchType = 'workspace-contains-extracted'
        console.log('✅ Workspace contains extracted:', workspace.name, 'contains', extractedName)
      }
      // Extracted name contains workspace name (e.g., "loopwell space" contains "loopwell")
      else if (extractedLower.includes(workspaceNameLower) && workspaceNameLower.length >= 4) {
        score = 75
        matchType = 'extracted-contains-workspace'
        console.log('✅ Extracted contains workspace:', extractedName, 'contains', workspace.name)
      }
      // Check if workspace contains significant words from extracted name
      else if (extractedWords.length > 0) {
        const matchingWords = extractedWords.filter(word => 
          workspaceWords.some(wsWord => wsWord.includes(word) || word.includes(wsWord))
        )
        if (matchingWords.length > 0) {
          // Score based on how many words match and their length
          const wordMatchScore = matchingWords.reduce((sum, word) => sum + word.length, 0)
          score = 70 + Math.min(wordMatchScore / 10, 5) // 70-75 range
          matchType = 'word-match'
          console.log('✅ Word match:', workspace.name, 'matches words:', matchingWords.join(', '))
        }
      }
      // Input contains workspace name
      else if (inputLower.includes(workspaceNameLower) && workspaceNameLower.length >= 4) {
        score = 70
        matchType = 'input-contains-workspace'
        console.log('✅ Input contains workspace:', input, 'contains', workspace.name)
      }
      // Use nameMatches function for fuzzy matching (lower priority)
      else if (nameMatches(workspaceName, extractedName)) {
        score = 60
        matchType = 'fuzzy-extracted'
        console.log('🔍 Fuzzy match (extracted):', workspace.name, 'with', extractedName)
      }
      else if (nameMatches(workspaceName, input)) {
        score = 55
        matchType = 'fuzzy-input'
        console.log('🔍 Fuzzy match (input):', workspace.name, 'with', input)
      }
      
      if (score > 0) {
        // Check if it's NOT a page name match (prioritize workspace if both match)
        const isPageMatch = pageList.some(page => 
          nameMatches(page.title, extractedName) && 
          page.title.toLowerCase() !== workspaceNameLower
        )
        
        if (!isPageMatch) {
          workspaceMatches.push({ workspace, score, matchType })
          console.log('   Added match candidate:', workspace.name, 'score:', score, 'type:', matchType)
        } else {
          console.log('   Skipped (conflicts with page):', workspace.name)
        }
      }
    }
    
    // Sort by score (highest first) and return the best match
    // If scores are equal, prefer the one with more word matches
    if (workspaceMatches.length > 0) {
      workspaceMatches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // Tie-breaker: prefer workspace that contains more words from extracted name
        const aWords = a.workspace.name.toLowerCase().split(/\s+/)
        const bWords = b.workspace.name.toLowerCase().split(/\s+/)
        const extractedWordsLower = extractedName.toLowerCase().split(/\s+/)
        const aMatches = extractedWordsLower.filter(w => aWords.some(aw => aw.includes(w) || w.includes(aw))).length
        const bMatches = extractedWordsLower.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw))).length
        return bMatches - aMatches
      })
      const bestMatch = workspaceMatches[0]
      console.log('🏆 Best workspace match:', bestMatch.workspace.name, 'score:', bestMatch.score, 'type:', bestMatch.matchType)
      console.log('   All candidates:', workspaceMatches.map(m => `${m.workspace.name} (${m.score})`).join(', '))
      return { type: 'workspace', id: bestMatch.workspace.id, name: bestMatch.workspace.name }
    }
    
    // SECOND: Check for parent page matches (only if no workspace was matched)
    for (const page of pageList) {
      const pageTitle = page.title
      // Check if page name matches the extracted name or the full input
      if (nameMatches(pageTitle, extractedName) || nameMatches(pageTitle, input)) {
        console.log('✅ Matched parent page:', page.title, 'from input:', input, '(extracted:', extractedName, ')')
        return { type: 'parent', id: page.id, name: page.title }
      }
    }
    
    // THIRD: Check for "under" or "subpage" keywords - extract name after these words
    if (lowerInput.includes('under') || lowerInput.includes('subpage')) {
      // Try to find text after "under" or "subpage"
      const underMatch = lowerInput.match(/(?:under|subpage)\s+['"]?([^'"]+)['"]?/i)
      if (underMatch) {
        const afterKeyword = extractEntityName(underMatch[1])
        console.log('🔍 Found text after "under/subpage":', afterKeyword)
        
        if (afterKeyword) {
          // Check if it matches a page
          for (const page of pageList) {
            if (nameMatches(page.title, afterKeyword)) {
              console.log('✅ Matched parent page after keyword:', page.title)
              return { type: 'parent', id: page.id, name: page.title }
            }
          }
          
          // Check if it matches a workspace (user might say "under Loopwell Space" meaning workspace)
          for (const workspace of workspaceList) {
            if (nameMatches(workspace.name, afterKeyword)) {
              console.log('✅ Matched workspace after keyword:', workspace.name)
              return { type: 'workspace', id: workspace.id, name: workspace.name }
            }
          }
        }
      }
      
      // If just "under" without specific name, default to first recent page
      if (pageList.length > 0 && extractedName.length < 3) {
        console.log('✅ Defaulting to first recent page (no specific name found)')
        return { type: 'parent', id: pageList[0].id, name: pageList[0].title }
      }
    }
    
    // FOURTH: Default fallbacks
    if (workspaceList.length > 0 && (lowerInput.includes('main') || lowerInput.includes('top'))) {
      console.log('✅ Matched default workspace (main/top)')
      return { type: 'workspace', id: workspaceList[0].id, name: workspaceList[0].name }
    }
    
    console.log('❌ No location matched')
    return null
  }

  // Wrapper function that uses component's workspaces and recentPages
  const parseLocation = (input: string): { type: 'workspace' | 'parent', id: string, name: string } | null => {
    return parseLocationWithWorkspaces(input, workspaces, recentPages)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Open panel when first message is sent
    if (!isOpen) {
      setIsOpen(true)
      onOpenChange?.(true)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    // Add user message to chat immediately
    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput("")
    setIsLoading(true) // Set loading immediately

    console.log('📤 handleSend - Current state:', pageCreationState, 'Input:', currentInput)
    console.log('📤 handleSend - Pending title:', pendingPageTitle)
    console.log('📤 handleSend - Messages count:', messages.length)

    // FALLBACK: Check conversation context if state doesn't match
    // If last assistant message asked for location, treat this as location input
    // Use updated messages array that includes the user message we just added
    const updatedMessages = [...messages, userMessage]
    const lastAssistantMessage = updatedMessages.filter(m => m.role === 'assistant').slice(-1)[0]
    const isLocationQuestion = lastAssistantMessage?.content?.includes('Where should it live') || 
                               lastAssistantMessage?.content?.includes('Where should') ||
                               lastAssistantMessage?.content?.toLowerCase().includes('location')
    
    console.log('🔍 Context check - Last assistant message:', lastAssistantMessage?.content?.substring(0, 50))
    console.log('🔍 Context check - Is location question:', isLocationQuestion)
    console.log('🔍 Context check - Has pending title:', !!pendingPageTitle)
    
    // PRIORITY CHECK: If we have pending title and last message asked for location,
    // we MUST be in location handling mode, regardless of state
    // This is a critical fallback for when state gets out of sync
    const isDefinitelyLocationInput = pendingPageTitle && isLocationQuestion
    
    if (isDefinitelyLocationInput && pageCreationState !== 'waiting_for_location') {
      console.warn('⚠️ STATE MISMATCH DETECTED! Forcing location handling...')
      console.warn('   Pending title:', pendingPageTitle)
      console.warn('   Current state:', pageCreationState)
      console.warn('   Last message:', lastAssistantMessage?.content)
      // Don't set state here - we'll handle it in the location block
    }

    // Handle page creation flow - MUST be before API call
    // BUT: Skip title handling if we're definitely in location mode
    if (pageCreationState === 'waiting_for_title' && !isDefinitelyLocationInput) {
      // User provided title, extract it properly
      const title = extractTitle(currentInput)
      console.log('📝 Extracted title from input:', currentInput, '->', title)
      
      if (!title || title.length < 1) {
        // If we couldn't extract a title, ask again
        const clarificationMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I didn\'t catch the page title. Could you tell me what the page should be called?',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, clarificationMessage])
        setIsLoading(false)
        return
      }
      
      setPendingPageTitle(title)
      setPageCreationState('waiting_for_location')
      
      // Build location question with available options
      const workspaceOptions = workspaces.length > 0 
        ? workspaces.map(w => `"${w.name}"`).join(' or ')
        : ''
      const recentPageOptions = recentPages.length > 0
        ? recentPages.slice(0, 5).map(p => `"${p.title}"`).join(', ')
        : ''
      
      console.log('📍 Available workspaces:', workspaces.map(w => w.name))
      console.log('📍 Available pages:', recentPages.slice(0, 5).map(p => p.title))
      
      let locationQuestion = `Great! I'll call it "${title}".\n\nWhere should it live?`
      
      if (workspaces.length > 0) {
        locationQuestion += `\n\nShould it be a main page under ${workspaceOptions}`
      }
      
      if (recentPages.length > 0) {
        locationQuestion += workspaces.length > 0 ? ', or' : '\n\nShould it be'
        locationQuestion += ` a subpage under ${recentPageOptions}${recentPages.length > 5 ? ' (or another page)' : ''}?`
      } else if (workspaces.length > 0) {
        locationQuestion += '?'
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: locationQuestion,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
      return
    }
    
    // Check if we should handle location (either by state OR by context fallback)
    const shouldHandleLocation = pageCreationState === 'waiting_for_location' || isDefinitelyLocationInput
    
    if (shouldHandleLocation) {
      // User provided location, create the page - don't call API
      console.log('📍 IN LOCATION HANDLING - State:', pageCreationState, 'Context fallback:', !pageCreationState && isLocationQuestion)
      console.log('📍 Parsing location from input:', currentInput)
      console.log('📍 Pending page title:', pendingPageTitle)
      console.log('🔍 Available workspaces:', workspaces.length, workspaces.map(w => ({ name: w.name, id: w.id })))
      console.log('🔍 Available pages:', recentPages.length, recentPages.map(p => ({ title: p.title, id: p.id })))
      
      // Ensure state is correct
      if (pageCreationState !== 'waiting_for_location') {
        setPageCreationState('waiting_for_location')
      }
      
      // CRITICAL: Ensure we don't fall through to API call
      if (!pendingPageTitle) {
        console.error('⚠️ No pending page title found! Resetting state.')
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I lost track of the page title. Let\'s start over - what should the page be called?',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        setPageCreationState('idle')
        setPendingPageTitle("")
        setIsLoading(false)
        return
      }
      
      try {
        // If workspaces are empty, try to fetch them directly
        let workspacesToUse = workspaces
        if (workspaces.length === 0) {
          console.warn('⚠️ Workspaces array is empty! Attempting to fetch workspaces...')
          try {
            const workspacesResponse = await fetch('/api/wiki/workspaces')
            if (workspacesResponse.ok) {
              const workspacesData = await workspacesResponse.json()
              if (Array.isArray(workspacesData) && workspacesData.length > 0) {
                console.log('✅ Fetched workspaces:', workspacesData.map((w: any) => w.name))
                workspacesToUse = workspacesData.map((w: any) => ({
                  id: w.id,
                  name: w.name,
                  type: w.type || 'team',
                  color: w.color,
                  icon: w.icon
                }))
              }
            }
          } catch (error) {
            console.error('Error fetching workspaces:', error)
          }
        }
        
        // If still no workspaces, show error
        if (workspacesToUse.length === 0) {
          const clarificationMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I'm having trouble finding your workspaces. Could you try again, or specify the workspace name more explicitly?`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, clarificationMessage])
          setIsLoading(false)
          return
        }
        
        // Parse location with available workspaces
        const location = parseLocationWithWorkspaces(currentInput.trim(), workspacesToUse, recentPages)
        console.log('🔍 Parsed location result:', location)
        
        if (!location) {
          console.log('❌ Could not parse location from:', currentInput)
          // Couldn't parse location, ask for clarification
          const workspaceList = workspacesToUse.length > 0 
            ? workspacesToUse.map(w => `"${w.name}"`).join(', ')
            : 'no workspaces available'
          const pageList = recentPages.length > 0
            ? recentPages.slice(0, 3).map(p => `"${p.title}"`).join(', ')
            : 'no recent pages'
          
          const clarificationMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I'm not sure where you'd like to create "${pendingPageTitle}". Could you specify:\n- A workspace name (${workspaceList})\n- Or a parent page name (${pageList})`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, clarificationMessage])
          setIsLoading(false)
          return
        }
        
        setPendingPageLocation(location)
        
        // Determine workspace ID based on location
        let workspaceId = ''
        if (location.type === 'workspace') {
          workspaceId = location.id
          console.log('✅ Using workspace ID from location:', workspaceId, location.name)
        } else {
          // For parent pages, find the workspace of the parent page
          const parentPage = recentPages.find(p => p.id === location.id)
          if (parentPage?.workspace_type) {
            // Try to find workspace by type
            const workspace = workspacesToUse.find(w => w.type === parentPage.workspace_type || w.id === parentPage.workspace_type)
            workspaceId = workspace?.id || workspacesToUse[0]?.id || ''
            console.log('✅ Using workspace ID from parent page:', workspaceId)
          } else {
            workspaceId = workspacesToUse[0]?.id || ''
            console.log('✅ Using first available workspace ID:', workspaceId)
          }
        }
        
        if (!workspaceId) {
          console.error('❌ No workspace ID determined!')
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'I couldn\'t determine the workspace. Please try again.',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
          setPageCreationState('idle')
          setPendingPageTitle("")
          setPendingPageLocation(null)
          setIsLoading(false)
          return
        }
        
        console.log('🚀 About to create page:', {
          title: pendingPageTitle,
          workspaceId: workspaceId,
          location: location.name,
          hasOnCreatePage: !!onCreatePage
        })
        
        // Create the page
        setIsCreatingPage(true)
        try {
          if (onCreatePage) {
            console.log('📝 Calling onCreatePage callback...')
            await onCreatePage(pendingPageTitle, '', workspaceId)
            console.log('✅ onCreatePage completed successfully')
            const successMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Done! I created "${pendingPageTitle}" ${location.type === 'workspace' ? `as a main page under ${location.name}` : `as a subpage under ${location.name}`}. Would you like me to add any content or structure to it?`,
              timestamp: new Date()
            }
            console.log('💬 Adding success message to chat')
            setMessages(prev => [...prev, successMessage])
          } else {
            // Fallback: Create page directly via API if onCreatePage is not provided
            console.log('📝 onCreatePage not provided, creating page directly via API...')
            try {
              // Find workspace type
              // For custom workspaces, workspace_type should be the workspace ID itself
              // For standard workspaces, it should be 'team' or 'personal'
              const selectedWorkspace = workspacesToUse.find(w => w.id === workspaceId)
              let workspaceType: string
              let permissionLevel: string
              
              if (selectedWorkspace) {
                // We have workspace info
                if (selectedWorkspace.type === 'personal') {
                  workspaceType = 'personal'
                  permissionLevel = 'personal'
                } else if (selectedWorkspace.type === 'team') {
                  workspaceType = 'team'
                  permissionLevel = 'team'
                } else {
                  // Custom workspace - use the workspace ID as workspace_type
                  workspaceType = workspaceId
                  permissionLevel = 'team'
                }
              } else {
                // No workspace info available - check if workspaceId looks like a custom workspace
                // Custom workspace IDs typically start with 'wiki-'
                if (workspaceId.startsWith('wiki-')) {
                  // Custom workspace - use the ID itself
                  workspaceType = workspaceId
                  permissionLevel = 'team'
                } else {
                  // Fallback to team
                  workspaceType = 'team'
                  permissionLevel = 'team'
                }
              }
              
              console.log('🔍 Creating page with workspace_type:', workspaceType, 'workspaceId:', workspaceId)
              
              const response = await fetch('/api/wiki/pages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: pendingPageTitle.trim(),
                  content: ' ',
                  tags: [],
                  category: 'general',
                  permissionLevel: permissionLevel,
                  workspace_type: workspaceType
                })
              })
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(errorData.error || 'Failed to create page')
              }
              
              const newPage = await response.json()
              console.log('✅ Page created successfully via API:', newPage)
              
              // Navigate to the new page
              if (newPage.slug) {
                window.location.href = `/wiki/${newPage.slug}`
              }
              
              const successMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Done! I created "${pendingPageTitle}" ${location.type === 'workspace' ? `as a main page under ${location.name}` : `as a subpage under ${location.name}`}. Would you like me to add any content or structure to it?`,
                timestamp: new Date()
              }
              console.log('💬 Adding success message to chat')
              setMessages(prev => [...prev, successMessage])
            } catch (apiError) {
              console.error('❌ Error creating page via API:', apiError)
              throw apiError
            }
          }
        } catch (error) {
          console.error('❌ Error creating page:', error)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Sorry, there was an error creating the page: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
        } finally {
          console.log('🧹 Cleaning up state...')
          setIsCreatingPage(false)
          setPageCreationState('idle')
          setPendingPageTitle("")
          setPendingPageLocation(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in location parsing flow:', error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        setIsLoading(false)
      }
      return
    }

    // Check if user is asking to create a page - MUST be before API call
    // BUT: Don't restart if we're already in a page creation flow
    const createPagePhrases = ['create a page', 'create page', 'new page', 'make a page', 'can you create']
    const isCreatePageRequest = createPagePhrases.some(phrase => 
      currentInput.trim().toLowerCase().includes(phrase.toLowerCase())
    )
    
    // If we're already in a page creation flow and user says "create page" again,
    // they might be confirming or trying to restart - handle gracefully
    if (isCreatePageRequest && pageCreationState !== 'idle') {
      // User is trying to restart while in flow - ask them to complete current step
      const clarificationMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: pageCreationState === 'waiting_for_title' 
          ? 'I\'m waiting for the page title. What should the page be called?'
          : `I'm waiting for the location. Where should "${pendingPageTitle}" be created?`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, clarificationMessage])
      setIsLoading(false)
      return
    }

    if (isCreatePageRequest && pageCreationState === 'idle') {
      // Start page creation flow - don't call AI API
      setPageCreationState('waiting_for_title')
      setIsLoading(false)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sure — I can create a page. Could you tell me:\n\n• What should the page be titled?',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      return
    }

    // Check if user is confirming a pending preview
    const confirmationPhrases = ['confirm', 'yes', 'apply', 'proceed', 'accept', 'ok', 'okay']
    const isConfirmation = confirmationPhrases.some(phrase => 
      currentInput.trim().toLowerCase().startsWith(phrase.toLowerCase())
    )

    if (isConfirmation && pendingPreview) {
      // Handle confirmation
      if (pendingPreview.intent === 'create_new_page') {
        // For new page creation - show preview modal for workspace selection
        if (pendingPreview.preview?.title && pendingPreview.preview?.markdown) {
          setPendingPageTitle(pendingPreview.preview.title)
          setPendingPageContent(pendingPreview.preview.markdown)
          setShowWorkspaceSelectDialog(true)
        }
      } else if (pendingPreview.intent === 'append_to_page') {
        if (pendingPreview.preview?.markdown && onContentUpdate) {
          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
          const existingContent = currentContent || ''
          const newContent = existingContent.trim() 
            ? `${existingContent}\n\n${cleanedMarkdown}`
            : cleanedMarkdown
          onContentUpdate(newContent)
        }
        if (pendingPreview.preview?.title && onTitleUpdate) {
          onTitleUpdate(pendingPreview.preview.title)
        }
      } else if (pendingPreview.intent === 'improve_existing_page') {
        if (pendingPreview.preview?.markdown && onContentUpdate) {
          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
          onContentUpdate(cleanedMarkdown)
        }
      }
      
      // Add confirmation message (user message already added above)
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: currentInput.trim(),
        timestamp: new Date()
      }
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: pendingPreview.intent === 'create_new_page' ? 'Page created successfully!' : 'Changes applied successfully!',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, confirmMessage, assistantMessage])
      setPendingPreview(null)
      setIsLoading(false)
      return
    }

    // If we get here, proceed with normal AI API call
    setIsLoading(true)

    try {
      // Wait for session ID if not ready yet
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const sessionResponse = await fetch('/api/ai/chat-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            title: currentTitle || 'Wiki Chat'
          })
        })
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          currentSessionId = sessionData.sessionId
          setSessionId(currentSessionId)
        } else {
          throw new Error('Failed to create session')
        }
      }

      // Call LoopwellAI API with context
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: currentSessionId,
          model: 'gpt-4-turbo',
          context: {
            pageId: currentPageId,
            title: currentTitle,
            content: currentContent,
            selectedText: selectedText
          }
        })
      })

      if (!response.ok) {
        // Try to extract error details from response
        let errorMessage = 'Failed to get AI response'
        try {
          const errorData = await response.json()
          errorMessage = errorData.details || errorData.error || errorMessage
          console.error('❌ AI API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details
          })
        } catch (parseError) {
          // If response isn't JSON, use status text
          errorMessage = `${response.status} ${response.statusText}`
          console.error('❌ AI API error (non-JSON):', {
            status: response.status,
            statusText: response.statusText
          })
        }
        throw new Error(errorMessage)
      }

      const data: LoopwellAIResponse = await response.json()
      
      // Determine mode: Page Context Mode (has currentPageId OR is editing a draft) vs Global Mode
      // If user is editing a draft page (has content/title), treat as Page Context Mode
      const isPageContextMode = !!currentPageId || !!(currentContent || currentTitle !== 'New page')
      const isGlobalMode = !isPageContextMode
      
      // NOTION-STYLE: Automatically insert content for write intents
      const writeIntents = ['create_new_page', 'append_to_page', 'improve_existing_page']
      const hasMarkdown = data.preview?.markdown && data.preview.markdown.trim().length > 0
      
      if (writeIntents.includes(data.intent) && hasMarkdown) {
        const cleanedMarkdown = cleanMarkdownContent(data.preview.markdown)
        
        // PAGE CONTEXT MODE: Auto-insert into current page
        if (isPageContextMode) {
          if (data.intent === 'create_new_page') {
            // User explicitly wants a new page - check if they mentioned location
            const wantsNewPage = currentInput.toLowerCase().includes('new page') || 
                                 currentInput.toLowerCase().includes('create a') ||
                                 currentInput.toLowerCase().includes('separate page')
            
            if (wantsNewPage) {
              // Show workspace selection dialog
              if (data.preview?.title) {
                setPendingPageTitle(data.preview.title)
                setPendingPageContent(cleanedMarkdown)
                setShowWorkspaceSelectDialog(true)
                
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `I've prepared "${data.preview.title}". Please select where to create it.`,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsLoading(false)
                return
              }
            } else {
              // User didn't explicitly say "new page" - stream content into current page
              if (currentPageId && onContentUpdate) {
                // Stream content generation for current page
                streamContentToPage(currentPageId, currentInput, cleanedMarkdown)
                setIsLoading(false)
                return
              } else if (onContentUpdate) {
                // Fallback: insert content directly if no pageId
                const existingContent = currentContent || ''
                const isEmpty = !existingContent || existingContent.trim().length === 0
                
                if (isEmpty) {
                  onContentUpdate(cleanedMarkdown)
                } else {
                  const newContent = `${existingContent}\n\n${cleanedMarkdown}`
                  onContentUpdate(newContent)
                }
                
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: 'Content has been added to your page.',
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsLoading(false)
                return
              }
            }
          } else if (data.intent === 'append_to_page') {
            // Auto-append to current page
            if (onContentUpdate) {
              const existingContent = currentContent || ''
              const newContent = existingContent.trim() 
                ? `${existingContent}\n\n${cleanedMarkdown}`
                : cleanedMarkdown
              onContentUpdate(newContent)
              
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Content has been appended to the page.',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, assistantMessage])
              setIsLoading(false)
              return
            }
          } else if (data.intent === 'improve_existing_page') {
            // Auto-improve current page
            if (onContentUpdate) {
              onContentUpdate(cleanedMarkdown)
              
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Page has been improved and updated.',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, assistantMessage])
              setIsLoading(false)
              return
            }
          }
        } else {
          // GLOBAL MODE: Create new page
          if (data.intent === 'create_new_page') {
            const suggestedTitle = data.preview?.title || extractTitle(currentInput) || 'Untitled'
            
            // Check if page with this title exists
            const pageExists = recentPages.some(page => 
              page.title.toLowerCase() === suggestedTitle.toLowerCase()
            )
            
            if (pageExists && data.preview?.title) {
              // Page exists - show options
              setPendingPreview({
                ...data,
                rationale: `Page "${suggestedTitle}" already exists. Should I overwrite it, rename it, or append to the existing content?`
              })
              
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I've generated the content, but a page titled "${suggestedTitle}" already exists. Please choose an option below.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, assistantMessage])
              setIsLoading(false)
              return
            } else {
              // Page doesn't exist - show workspace selection dialog
              if (data.preview?.title) {
                setPendingPageTitle(data.preview.title)
                setPendingPageContent(cleanedMarkdown)
                setShowWorkspaceSelectDialog(true)
                
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `I've prepared "${data.preview.title}". Please select where to create it.`,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsLoading(false)
                return
              }
            }
          }
        }
      }
      
      // For other intents (extract_tasks, tag_pages) - show preview card
      const requiresPreview = ['extract_tasks', 'tag_pages'].includes(data.intent)
      
      if (requiresPreview) {
        setPendingPreview(data)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've prepared ${data.intent.replace(/_/g, ' ')}. Please review and confirm below.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // For answer, find_things, do_nothing, summarize - show response directly
        const content = data.preview?.markdown || data.rationale
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: content || 'Sorry, I could not generate a response.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Extract more detailed error message
      const errorDetails = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, there was an error processing your request: ${errorDetails}. Please try again or check your AI API configuration.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { label: "AI Meeting Notes", icon: FileText },
    { label: "Form", icon: FileText },
    { label: "Templates", icon: Sparkles }
  ]

  // Floating button for when closed in floating-button mode
  // Position: bottom-right for read mode
  const FloatingButton = mode === 'floating-button' && !isOpen ? (
    <button
      onClick={() => {
        setIsOpen(true)
        onOpenChange?.(true)
        // Ensure floating mode when opened from button
        setDisplayMode('floating')
        onDisplayModeChange?.('floating')
      }}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center group overflow-hidden"
      aria-label="Open AI Assistant"
    >
      <AILogo 
        width={28} 
        height={28} 
        className="w-7 h-7 group-hover:scale-110 transition-transform"
        priority
      />
    </button>
  ) : null

  return (
    <>
      {FloatingButton}
      {/* Unified AI Container - Transforms from bottom to right */}
      <div 
        className={cn(
          "fixed shadow-lg flex flex-col",
          "transition-all duration-500 ease-in-out z-50",
          isOpen 
            ? isMinimized
              ? "bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center cursor-pointer hover:shadow-xl bg-purple-600 hover:bg-purple-700 border-0"
              : "bg-card border border-border " + (displayMode === 'floating'
                ? "top-[50%] right-4 -translate-y-1/2 h-[600px] rounded-lg w-[500px]"
                : "right-0 top-0 h-full rounded-none w-full md:w-96")
            : mode === 'floating-button'
              ? "hidden" // Hidden when closed in floating-button mode (button shown separately)
              : "bg-card border border-border bottom-4 rounded-lg max-w-2xl"
        )}
        style={isOpen ? {} : mode === 'bottom-bar' ? { 
          width: 'min(calc(100vw - 280px), 768px)',
          left: 'calc((100vw + 240px) / 2)',
          transform: 'translateX(-50%)',
          maxWidth: '768px'
        } : {}}
        onClick={isOpen && isMinimized ? () => setIsMinimized(false) : undefined}
      >
        {/* Minimized Logo - Only visible when minimized */}
        {isOpen && isMinimized && (
          <AILogo 
            width={28} 
            height={28} 
            className="w-7 h-7"
            priority
          />
        )}

        {/* Header - Only visible when open and not minimized - Notion style */}
        {isOpen && !isMinimized && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">New AI chat</span>
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Start new chat"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {/* Floating/Sidebar Toggle Button */}
              <button
                onClick={() => {
                  const newMode = displayMode === 'sidebar' ? 'floating' : 'sidebar'
                  setDisplayMode(newMode)
                  onDisplayModeChange?.(newMode)
                }}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title={displayMode === 'sidebar' ? 'Switch to floating' : 'Switch to sidebar'}
              >
                {displayMode === 'sidebar' ? (
                  <Move className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sidebar className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {/* Minimize Button */}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title={isMinimized ? 'Restore' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsOpen(false)
                  onOpenChange?.(false)
                }}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}


        {/* Chat Messages - Only visible when open - Notion style */}
        {isOpen && !isMinimized && (
          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            {messages.length === 0 ? (
              <div className="flex flex-col items-start p-6 max-w-3xl mx-auto">
                {/* Large Loopwell Logo Avatar */}
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <AILogo 
                      width={40} 
                      height={40} 
                      className="w-10 h-10"
                    />
                  </div>
                </div>
                
                {/* Greeting */}
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  How can I help you today?
                </h2>
                
                {/* Suggested Actions */}
                <div className="space-y-2 w-full">
                  <button
                    onClick={() => {
                      setInput("Personalize your Loopwell AI")
                      inputRef.current?.focus()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-sm text-foreground flex-1">Personalize your Loopwell AI</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setInput("Translate this page")
                      inputRef.current?.focus()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground">Translate this page</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setInput("Analyze for insights")
                      inputRef.current?.focus()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground flex-1">Analyze for insights</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setInput("Create a task tracker")
                      inputRef.current?.focus()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground flex-1">Create a task tracker</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar for assistant messages */}
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <AILogo 
                          width={20} 
                          height={20} 
                          className="w-5 h-5"
                        />
                      </div>
                    )}
                    <div
                      className={`flex-1 rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-0 text-foreground border-b border-border pb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6 text-foreground">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-5 text-foreground">{children}</h3>,
                              h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-4 text-foreground">{children}</h4>,
                              p: ({ children }) => <p className="text-sm mb-4 leading-relaxed text-foreground last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-outside mb-4 ml-5 space-y-2 text-sm text-foreground">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-outside mb-4 ml-5 space-y-2 text-sm text-foreground">{children}</ol>,
                              li: ({ children }) => <li className="text-sm text-foreground leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                              em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                              code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                              pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-4 text-xs font-mono text-foreground border border-border">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-400 dark:border-purple-600 pl-4 italic mb-4 text-foreground bg-purple-50 dark:bg-purple-900/10 py-2">{children}</blockquote>,
                              hr: () => <hr className="my-6 border-border" />,
                              a: ({ children, href }) => <a href={href} className="text-purple-600 dark:text-purple-400 hover:underline">{children}</a>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {/* Draft to page button - REMOVED: LoopwellAI handles drafts through preview cards based on intent */}
                  </div>
                ))}
                
                {/* Pending Preview Card */}
                {pendingPreview && (
                  <div className="mt-4 mb-4">
                    <AIPreviewCard
                      response={pendingPreview}
                      onExpand={() => {
                        // Show workspace selection dialog
                        if (pendingPreview.preview?.title && pendingPreview.preview?.markdown) {
                          setPendingPageTitle(pendingPreview.preview.title)
                          setPendingPageContent(cleanMarkdownContent(pendingPreview.preview.markdown))
                          setShowWorkspaceSelectDialog(true)
                        }
                      }}
                      onConfirm={() => {
                        // Handle confirmation based on intent
                        if (pendingPreview.intent === 'create_new_page') {
                          // For new page creation - show workspace selection dialog
                          if (pendingPreview.preview?.title && pendingPreview.preview?.markdown) {
                            setPendingPageTitle(pendingPreview.preview.title)
                            setPendingPageContent(cleanMarkdownContent(pendingPreview.preview.markdown))
                            setShowWorkspaceSelectDialog(true)
                          }
                        } else if (pendingPreview.intent === 'append_to_page') {
                          if (pendingPreview.preview?.markdown && onContentUpdate) {
                            const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                            const existingContent = currentContent || ''
                            const newContent = existingContent.trim() 
                              ? `${existingContent}\n\n${cleanedMarkdown}`
                              : cleanedMarkdown
                            onContentUpdate(newContent)
                          }
                          if (pendingPreview.preview?.title && onTitleUpdate) {
                            onTitleUpdate(pendingPreview.preview.title)
                          }
                          // Add success message
                          const successMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: 'Content appended successfully!',
                            timestamp: new Date()
                          }
                          setMessages(prev => [...prev, successMessage])
                          setPendingPreview(null)
                        } else if (pendingPreview.intent === 'improve_existing_page') {
                          if (pendingPreview.preview?.markdown && onContentUpdate) {
                            const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                            onContentUpdate(cleanedMarkdown)
                          }
                          // Add success message
                          const successMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: 'Changes applied successfully!',
                            timestamp: new Date()
                          }
                          setMessages(prev => [...prev, successMessage])
                          setPendingPreview(null)
                        } else {
                          // TODO: Handle extract_tasks and tag_pages
                          setPendingPreview(null)
                        }
                      }}
                      onOverwrite={() => {
                        // Overwrite existing page
                        if (pendingPreview.preview?.markdown && onContentUpdate) {
                          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                          onContentUpdate(cleanedMarkdown)
                        }
                        setPendingPreview(null)
                      }}
                      onRename={(newTitle) => {
                        // Rename and create new page
                        if (pendingPreview.preview?.markdown) {
                          setPendingPageTitle(newTitle)
                          setPendingPageContent(cleanMarkdownContent(pendingPreview.preview.markdown))
                          setShowWorkspaceSelectDialog(true)
                        }
                        setPendingPreview(null)
                      }}
                      onAppend={() => {
                        // Append to existing page
                        if (pendingPreview.preview?.markdown && onContentUpdate) {
                          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                          const existingContent = currentContent || ''
                          const newContent = existingContent.trim() 
                            ? `${existingContent}\n\n${cleanedMarkdown}`
                            : cleanedMarkdown
                          onContentUpdate(newContent)
                        }
                        setPendingPreview(null)
                      }}
                      onOverwrite={() => {
                        // Overwrite existing page
                        if (pendingPreview.preview?.markdown && onContentUpdate) {
                          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                          onContentUpdate(cleanedMarkdown)
                        }
                        setPendingPreview(null)
                      }}
                      onRename={(newTitle) => {
                        // Rename and create new page
                        if (pendingPreview.preview?.markdown) {
                          setPendingPageTitle(newTitle)
                          setPendingPageContent(cleanMarkdownContent(pendingPreview.preview.markdown))
                          setShowWorkspaceSelectDialog(true)
                        }
                        setPendingPreview(null)
                      }}
                      onAppend={() => {
                        // Append to existing page
                        if (pendingPreview.preview?.markdown && onContentUpdate) {
                          const cleanedMarkdown = cleanMarkdownContent(pendingPreview.preview.markdown)
                          const existingContent = currentContent || ''
                          const newContent = existingContent.trim() 
                            ? `${existingContent}\n\n${cleanedMarkdown}`
                            : cleanedMarkdown
                          onContentUpdate(newContent)
                        }
                        setPendingPreview(null)
                      }}
                      onReject={() => {
                        setPendingPreview(null)
                      }}
                      onContentUpdate={onContentUpdate}
                      onTitleUpdate={onTitleUpdate}
                    />
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing intent...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Section - Notion style - Hidden only when minimized */}
        {!isMinimized && (
        <div className={cn(
          "p-4 border-t border-border shrink-0 bg-card",
          !isOpen && "border-t-0 p-2"
        )}>
          {/* Options Row - Above Input */}
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto">
            {/* Quick Actions */}
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
            
            {/* @ Button */}
            <button className="p-1.5 hover:bg-muted rounded transition-colors flex-shrink-0">
              <AtSign className="h-4 w-4 text-muted-foreground" />
            </button>
            
            {/* Getting Started Button - Only when no messages */}
            {messages.length === 0 && (
              <button className="px-2 py-1 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 text-muted-foreground flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0">
                <FileText className="h-3 w-3" />
                Getting Started
              </button>
            )}
            
            {/* All sources button */}
            <button className="p-1.5 hover:bg-muted rounded transition-colors flex items-center gap-1 flex-shrink-0" title="All sources">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">All sources</span>
            </button>
            
            {/* Attach file button */}
            <button className="p-1.5 hover:bg-muted rounded transition-colors flex-shrink-0" title="Attach file">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Input Field - Full Width */}
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask, search, or make anything..."
              className="flex-1 text-sm border border-border bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md px-3 py-2"
            />
            
            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Send"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Send className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Backdrop - Only when open and not minimized */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setIsOpen(false)
            onOpenChange?.(false)
          }}
        />
      )}

      {/* Workspace Selection Dialog */}
      <AIWorkspaceSelectDialog
        open={showWorkspaceSelectDialog}
        onOpenChange={setShowWorkspaceSelectDialog}
        title={pendingPageTitle}
        workspaces={workspaces}
        isCreating={isCreatingPage}
        onSelect={async (workspaceId) => {
          setIsCreatingPage(true)
          try {
            // Create blank draft page first
            if (!onCreatePage) {
              throw new Error("onCreatePage callback not available")
            }
            
            // Store the original user prompt for drafting (get the LAST user message)
            const userMessages = messages.filter(m => m.role === 'user')
            const originalPrompt = userMessages.length > 0 
              ? userMessages[userMessages.length - 1].content 
              : pendingPageTitle
            
            console.log('📝 Preparing to create page:', { 
              title: pendingPageTitle, 
              prompt: originalPrompt.substring(0, 50), 
              workspaceId,
              userMessagesCount: userMessages.length
            })
            
            // Store page creation info for streaming BEFORE creating page
            const pageCreationInfo = {
              title: pendingPageTitle,
              prompt: originalPrompt,
              workspaceId,
              timestamp: Date.now()
            }
            
            console.log('💾 Storing draft info in sessionStorage:', pageCreationInfo)
            sessionStorage.setItem('pendingPageDraft', JSON.stringify(pageCreationInfo))
            
            // Verify it was stored
            const stored = sessionStorage.getItem('pendingPageDraft')
            console.log('✅ Draft info stored, verification:', stored ? 'Success' : 'Failed')
            
            // Create blank draft page (this will navigate)
            console.log('📄 Creating page now...')
            await onCreatePage(pendingPageTitle, ' ', workspaceId)
            console.log('✅ Page creation completed')
            
            // Add status message
            const statusMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Creating "${pendingPageTitle}" and drafting content now...`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, statusMessage])
            
            // Clear pending state (but keep dialog open until streaming starts)
            setPendingPageTitle("")
            setPendingPageContent("")
            setPendingPreview(null)
            
            // Close dialog - page will handle streaming
            setShowWorkspaceSelectDialog(false)
          } catch (error) {
            throw error
          } finally {
            setIsCreatingPage(false)
          }
        }}
      />
    </>
  )
}
