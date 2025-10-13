"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface FeatureFlags {
  useNewProjectLayout: boolean
  enableCircularButtons: boolean
  enableExpandedStatus: boolean
}

interface FeatureFlagContextType {
  flags: FeatureFlags
  setFlag: (key: keyof FeatureFlags, value: boolean) => void
  toggleFlag: (key: keyof FeatureFlags) => void
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined)

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>({
    useNewProjectLayout: process.env.NEXT_PUBLIC_USE_NEW_LAYOUT === 'true',
    enableCircularButtons: true,
    enableExpandedStatus: true
  })

  const setFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }))
    // Store in localStorage for persistence
    localStorage.setItem(`feature_flag_${key}`, value.toString())
  }

  const toggleFlag = (key: keyof FeatureFlags) => {
    setFlag(key, !flags[key])
  }

  // Load flags from localStorage on mount
  useEffect(() => {
    const storedFlags = Object.keys(flags).reduce((acc, key) => {
      const stored = localStorage.getItem(`feature_flag_${key}`)
      if (stored !== null) {
        acc[key as keyof FeatureFlags] = stored === 'true'
      }
      return acc
    }, {} as Partial<FeatureFlags>)

    setFlags(prev => ({ ...prev, ...storedFlags }))
  }, [])

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, toggleFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }
  return context
}


