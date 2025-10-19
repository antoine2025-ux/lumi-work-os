"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EMBED_PROVIDERS } from "@/types/embeds"
import { EmbedProvider } from "./embed-provider"
import { EmbedData } from "@/types/embeds"

interface EmbedCommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onEmbed: (embedData: Partial<EmbedData>) => void
  position?: { top: number; left: number }
}

export function EmbedCommandPalette({ 
  isOpen, 
  onClose, 
  onEmbed, 
  position = { top: 0, left: 0 } 
}: EmbedCommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter providers based on search query
  const filteredProviders = EMBED_PROVIDERS.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredProviders.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredProviders.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredProviders[selectedIndex]) {
            // Trigger the embed provider dialog
            const button = containerRef.current?.querySelector(
              `[data-provider-id="${filteredProviders[selectedIndex].id}"]`
            ) as HTMLButtonElement
            button?.click()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredProviders, onClose])

  // Reset selection when search query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-md w-full"
      style={{
        top: position.top,
        left: position.left,
        maxHeight: '400px'
      }}
    >
      <div className="p-3 border-b">
        <Input
          ref={inputRef}
          placeholder="Search embed providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 focus:ring-0 p-0"
        />
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {filteredProviders.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No providers found
          </div>
        ) : (
          <div className="py-2">
            {filteredProviders.map((provider, index) => (
              <EmbedProvider
                key={provider.id}
                provider={provider}
                onEmbed={onEmbed}
              >
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-4 py-3 h-auto ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  }`}
                  data-provider-id={provider.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{provider.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-500">
                        {provider.description}
                      </div>
                    </div>
                  </div>
                </Button>
              </EmbedProvider>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
