"use client"

import Image from "next/image"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface AILogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
  alt?: string
}

/**
 * Theme-aware AI Logo component
 * - Shows black logo for light theme
 * - Shows white logo with transparent background for dark theme
 * 
 * Uses mounted state to prevent hydration mismatch by ensuring
 * server and client render the same initial image
 */
export function AILogo({ 
  width = 28, 
  height = 28, 
  className,
  priority = false,
  alt = "Loopwell AI"
}: AILogoProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Ensure we're mounted before using theme to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Default to light theme logo for initial render (matches server)
  // This ensures server and client render the same thing initially
  const logoSrc = mounted && theme === 'dark' 
    ? '/white.png'  // White logo with transparent background for dark theme
    : '/black.png' // Black logo for light theme

  // Use regular img tag for white logo (dark mode) to ensure proper rendering
  if (logoSrc.includes('white')) {
    return (
      <div 
        className={cn("inline-block", className)}
        style={{ 
          backgroundColor: 'transparent',
          lineHeight: 0,
          width: width,
          height: height
        }}
      >
        <img 
          src={logoSrc}
          alt={alt}
          width={width}
          height={height}
          className="w-auto h-auto"
          style={{ 
            backgroundColor: 'transparent',
            display: 'block',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    )
  }

  return (
    <div 
      className={cn("inline-block", className)}
      style={{ 
        backgroundColor: 'transparent',
        lineHeight: 0,
        width: width,
        height: height
      }}
    >
      <Image 
        src={logoSrc}
        alt={alt}
        width={width}
        height={height}
        className="w-auto h-auto"
        priority={priority}
        style={{ 
          backgroundColor: 'transparent',
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  )
}

