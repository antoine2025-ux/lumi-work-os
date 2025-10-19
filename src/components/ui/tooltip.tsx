"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const Tooltip = ({ children, content, side = "bottom", className }: TooltipProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap",
            side === "top" && "bottom-full left-1/2 transform -translate-x-1/2 mb-1",
            side === "bottom" && "top-full left-1/2 transform -translate-x-1/2 mt-1",
            side === "left" && "right-full top-1/2 transform -translate-y-1/2 mr-1",
            side === "right" && "left-full top-1/2 transform -translate-y-1/2 ml-1",
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-4 border-transparent",
              side === "top" && "top-full left-1/2 transform -translate-x-1/2 border-t-gray-900",
              side === "bottom" && "bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900",
              side === "left" && "left-full top-1/2 transform -translate-y-1/2 border-l-gray-900",
              side === "right" && "right-full top-1/2 transform -translate-y-1/2 border-r-gray-900"
            )}
          />
        </div>
      )}
    </div>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref
    })
  }
  
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
