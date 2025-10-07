"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EmbedProvider as EmbedProviderType, EmbedData } from "@/types/embeds"

interface EmbedProviderProps {
  provider: EmbedProviderType
  onEmbed: (embedData: Partial<EmbedData>) => void
  children: React.ReactNode
}

export function EmbedProvider({ provider, onEmbed, children }: EmbedProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }

    if (provider.urlPattern && !provider.urlPattern.test(url)) {
      setError(`Please enter a valid ${provider.name} URL`)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(provider.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch embed data')
      }

      const embedData = await response.json()
      
      onEmbed({
        provider: provider.id,
        url,
        ...embedData
      })
      
      setIsOpen(false)
      setUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create embed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{provider.icon}</span>
            Embed {provider.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              {provider.name} URL
            </label>
            <Input
              id="url"
              type="url"
              placeholder={`Enter ${provider.name} URL...`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? "Creating..." : "Create Embed"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
