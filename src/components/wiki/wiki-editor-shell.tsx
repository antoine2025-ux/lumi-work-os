"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { TipTapEditor } from './tiptap-editor'
import { AutosaveStatus, type SaveStatus } from './autosave-status'
import { debounce } from '@/lib/utils'
import { JSONContent } from '@tiptap/core'
import { Editor } from '@tiptap/core'

interface WikiEditorShellProps {
  initialContent: JSONContent | null
  onSave: (content: JSONContent) => Promise<void>
  placeholder?: string
  className?: string
  onEditorReady?: (editor: Editor) => void
}

/**
 * Editor shell component that wraps TipTap editor with autosave functionality
 * Handles debounced saving and status display
 */
export function WikiEditorShell({
  initialContent,
  onSave,
  placeholder,
  className,
  onEditorReady
}: WikiEditorShellProps) {
  const [content, setContent] = useState<JSONContent | null>(initialContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isMountedRef = useRef(true)
  const latestContentRef = useRef<JSONContent | null>(initialContent)
  // Initialize with null to ensure first save always happens
  const lastSavedJsonRef = useRef<string | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const onSaveRef = useRef(onSave)
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null)
  const isInitializedRef = useRef(false)

  // Single authoritative save function - always reads from editor live state
  const saveNow = useCallback(async () => {
    if (!editorRef.current) {
      console.warn('Editor not ready for save')
      return
    }

    // Always read latest content from editor (never from state)
    const contentToSave = editorRef.current.getJSON()
    const contentString = JSON.stringify(contentToSave)
    
    // For new pages or first save, always save regardless of dirty check
    // Check if content actually changed (dirty check) - but skip for first save
    if (lastSavedJsonRef.current !== null && contentString === lastSavedJsonRef.current) {
      // No changes, skip save (but only if we've saved before)
      return
    }

    // Cancel any pending debounced autosave to prevent race conditions
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current.cancel()
    }

    latestContentRef.current = contentToSave

    try {
      setSaveStatus('saving')
      await onSaveRef.current(contentToSave)
      
      // Update last saved reference after successful save
      lastSavedJsonRef.current = contentString
      
      if (!isMountedRef.current) return
      
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
      
      if (!isMountedRef.current) return
      
      setSaveStatus('error')
      throw error // Re-throw so caller can handle
    }
  }, [])

  // Expose saveNow function to parent via ref callback
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
    
    // Mark as initialized and set proper baseline for dirty checking
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      // Set the baseline content from the editor's current state
      const currentContent = editor.getJSON()
      latestContentRef.current = currentContent
      
      // Only set lastSavedJsonRef if we have meaningful initial content
      // This ensures the first save always happens for new pages
      if (initialContent && initialContent.content && initialContent.content.length > 0) {
        lastSavedJsonRef.current = JSON.stringify(currentContent)
      }
    }
    
    // Attach saveNow to editor instance for parent access
    // This allows parent components to call saveNow() directly
    ;(editor as unknown as Record<string, unknown>).saveNow = saveNow
    if (onEditorReady) {
      onEditorReady(editor)
    }
  }, [onEditorReady, saveNow, initialContent])

  // Update lastSavedJsonRef when initialContent changes (e.g., after page reload)
  useEffect(() => {
    if (initialContent) {
      latestContentRef.current = initialContent
      
      // Only update lastSavedJsonRef if this is a page with existing content
      // For new pages with empty content, keep lastSavedJsonRef as null to ensure first save
      const hasContent = initialContent.content && initialContent.content.length > 0
      if (hasContent) {
        lastSavedJsonRef.current = JSON.stringify(initialContent)
      }
    }
  }, [initialContent])

  // Track latest content and onSave to avoid stale closures
  useEffect(() => {
    latestContentRef.current = content
  }, [content])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel any pending debounced saves
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel()
      }
    }
  }, [])

  // Create debounced autosave wrapper around saveNow (only once)
  useEffect(() => {
    const debounced = debounce(async () => {
      // Check if component is still mounted
      if (!isMountedRef.current || !editorRef.current) {
        return
      }

      // Check if content changed since last save (dirty check)
      const currentContent = editorRef.current.getJSON()
      const currentContentString = JSON.stringify(currentContent)
      
      // Skip autosave only if we've saved before and content hasn't changed
      if (lastSavedJsonRef.current !== null && currentContentString === lastSavedJsonRef.current) {
        // No changes, skip autosave
        return
      }

      // Use the same saveNow function (ensures consistency)
      try {
        await saveNow()
      } catch (error) {
        // Error handling is done in saveNow, but we can retry here
        console.error('Autosave failed:', error)
        
        if (!isMountedRef.current) return
        
        setSaveStatus('error')
        
        // Retry after 2 seconds (only if still mounted)
        const retryTimeout = setTimeout(() => {
          if (isMountedRef.current && editorRef.current && debouncedSaveRef.current) {
            debouncedSaveRef.current()
          }
        }, 2000)
        
        // Cleanup retry timeout on unmount
        return () => clearTimeout(retryTimeout)
      }
    }, 2000)
    
    debouncedSaveRef.current = debounced
    
    return () => {
      debounced.cancel()
    }
  }, [saveNow]) // Include saveNow in deps - it's stable via useCallback

  // Handle content changes
  const handleContentChange = (newContent: JSONContent) => {
    setContent(newContent)
    latestContentRef.current = newContent
    setSaveStatus('idle')
    
    // Trigger debounced autosave (will check dirty state internally)
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current()
    }
  }

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      if (saveStatus === 'offline' && latestContentRef.current && isMountedRef.current) {
        if (debouncedSaveRef.current) {
          debouncedSaveRef.current()
        }
      }
    }
    
    const handleOffline = () => {
      if (isMountedRef.current) {
        setSaveStatus('offline')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [saveStatus])

  // Expose saveNow via onEditorReady callback
  useEffect(() => {
    if (onEditorReady && editorRef.current) {
      // Pass saveNow function via the editor instance
      ;(editorRef.current as unknown as Record<string, unknown>).saveNow = saveNow
    }
  }, [saveNow, onEditorReady])

  return (
    <div className={className}>
      <TipTapEditor
        content={content}
        onChange={handleContentChange}
        placeholder={placeholder}
        editable={true}
        onEditorReady={handleEditorReady}
      />
      <div className="mt-2 flex justify-end">
        <AutosaveStatus status={saveStatus} lastSaved={lastSaved} />
      </div>
    </div>
  )
}

// Export saveNow function type for parent components
export type WikiEditorShellRef = {
  saveNow: () => Promise<void>
}

