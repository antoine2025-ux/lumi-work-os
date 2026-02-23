"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

interface LandingLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
  alt?: string
}

export function LandingLogo({ 
  width = 180, 
  height = 40, 
  className = "", 
  priority = false,
  alt = "Loopwell"
}: LandingLogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get effective theme
  const currentTheme = theme === "system" ? resolvedTheme : theme
  const isDark = currentTheme === "dark" || !mounted

  // Use white logo for dark mode, black logo for light mode
  const logoSrc = isDark ? "/white.png" : "/black.png"

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
