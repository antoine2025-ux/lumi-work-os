"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"

interface CircularActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  isExpanded?: boolean
  isActive?: boolean
  children?: ReactNode
  colors: {
    primary: string
    background: string
    surface: string
    text: string
    textSecondary: string
  }
}

export function CircularActionButton({
  icon: Icon,
  label,
  onClick,
  isExpanded = false,
  isActive = false,
  children,
  colors
}: CircularActionButtonProps) {
  return (
    <div className="text-center group relative z-20">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClick()
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
        style={{ 
          backgroundColor: isExpanded || isActive ? colors.primary : colors.surface 
        }}
      >
        <Icon className="h-5 w-5" style={{ 
          color: isExpanded || isActive ? colors.background : colors.textSecondary 
        }} />
      </button>
      <p 
        className={`text-sm font-medium transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${
          isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`} 
        style={{ color: colors.text }}
      >
        {label}
      </p>
      
      {/* Expansion Content */}
      {isExpanded && children && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30">
          {children}
        </div>
      )}
    </div>
  )
}


