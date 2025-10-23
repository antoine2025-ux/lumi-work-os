"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface FeatureFlags {
  useNewProjectLayout: boolean
  enableCircularButtons: boolean
  enableExpandedStatus: boolean
  enableAssistant: boolean
  enableRealtime: boolean
  enableAdvancedAnalytics: boolean
  enableBetaFeatures: boolean
}

interface FeatureFlagContextType {
  flags: FeatureFlags
  setFlag: (key: keyof FeatureFlags, value: boolean) => void
  toggleFlag: (key: keyof FeatureFlags) => void
  isProductionSafe: boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined)

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>({
    useNewProjectLayout: process.env.NEXT_PUBLIC_USE_NEW_LAYOUT === 'true',
    enableCircularButtons: true,
    enableExpandedStatus: true,
    enableAssistant: process.env.NEXT_PUBLIC_ENABLE_ASSISTANT === 'true',
    enableRealtime: process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true',
    enableAdvancedAnalytics: process.env.NODE_ENV !== 'production',
    enableBetaFeatures: process.env.NODE_ENV !== 'production'
  })

  const isProductionSafe = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_PROD_LOCK === 'true'

  const setFlag = (key: keyof FeatureFlags, value: boolean) => {
    // Block certain flags in production
    if (isProductionSafe && (key === 'enableAdvancedAnalytics' || key === 'enableBetaFeatures')) {
      console.warn(`Cannot modify ${key} in production environment`)
      return
    }

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

  // Update flags based on environment changes
  useEffect(() => {
    setFlags(prev => ({
      ...prev,
      enableAssistant: process.env.NEXT_PUBLIC_ENABLE_ASSISTANT === 'true',
      enableRealtime: process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true',
      enableAdvancedAnalytics: process.env.NODE_ENV !== 'production',
      enableBetaFeatures: process.env.NODE_ENV !== 'production'
    }))
  }, [])

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, toggleFlag, isProductionSafe }}>
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




