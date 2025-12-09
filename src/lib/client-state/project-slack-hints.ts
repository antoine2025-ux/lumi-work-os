'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'project-slack-hints'

type ProjectHintsMap = {
  [projectId: string]: string[]
}

/**
 * Get all project hints from localStorage
 */
function getAllHints(): ProjectHintsMap {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as ProjectHintsMap
    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed
  } catch (error) {
    console.error('Error reading project Slack hints from localStorage:', error)
    return {}
  }
}

/**
 * Save all project hints to localStorage
 */
function saveAllHints(hints: ProjectHintsMap): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hints))
  } catch (error) {
    console.error('Error saving project Slack hints to localStorage:', error)
  }
}

/**
 * Normalize channel names: trim, remove # prefix, remove empties, deduplicate
 */
function normalizeChannels(channels: string[]): string[] {
  return Array.from(
    new Set(
      channels
        .map((c) => c.trim().replace(/^#/, ''))
        .filter((c) => c.length > 0)
    )
  )
}

/**
 * React hook for managing Slack channel hints for a specific project
 * 
 * @param projectId - The project ID
 * @returns Object with hints array and setter function
 */
export function useProjectSlackHints(projectId: string | null | undefined) {
  const [hints, setHintsState] = useState<string[]>([])

  // Load hints on mount and when projectId changes
  useEffect(() => {
    if (!projectId) {
      setHintsState([])
      return
    }

    const allHints = getAllHints()
    const projectHints = allHints[projectId] || []
    setHintsState(normalizeChannels(projectHints))
  }, [projectId])

  // Setter function that updates both state and localStorage
  const setHints = useCallback(
    (newHints: string[]) => {
      if (!projectId) return

      const normalized = normalizeChannels(newHints)
      setHintsState(normalized)

      // Update localStorage
      const allHints = getAllHints()
      if (normalized.length === 0) {
        // Remove entry if empty
        delete allHints[projectId]
      } else {
        allHints[projectId] = normalized
      }
      saveAllHints(allHints)
    },
    [projectId]
  )

  return { hints, setHints }
}

/**
 * Get hints for a project without using React hook (for non-React contexts)
 * 
 * @param projectId - The project ID
 * @returns Array of channel names
 */
export function getProjectSlackHints(projectId: string | null | undefined): string[] {
  if (!projectId) return []
  const allHints = getAllHints()
  return normalizeChannels(allHints[projectId] || [])
}

/**
 * Set hints for a project without using React hook (for non-React contexts)
 * 
 * @param projectId - The project ID
 * @param hints - Array of channel names
 */
export function setProjectSlackHints(
  projectId: string | null | undefined,
  hints: string[]
): void {
  if (!projectId) return

  const normalized = normalizeChannels(hints)
  const allHints = getAllHints()

  if (normalized.length === 0) {
    delete allHints[projectId]
  } else {
    allHints[projectId] = normalized
  }

  saveAllHints(allHints)
}



