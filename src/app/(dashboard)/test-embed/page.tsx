"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestEmbedPage() {
  const [url, setUrl] = useState("https://github.com/antoine2025-ux/lumi-work-os")
  const [embedData, setEmbedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const testEmbed = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch('/api/embeds/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch embed data')
      }

      const data = await response.json()
      setEmbedData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create embed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Embed Test Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test GitHub Embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">GitHub URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter GitHub URL..."
            />
          </div>
          
          <Button onClick={testEmbed} disabled={loading}>
            {loading ? "Testing..." : "Test Embed"}
          </Button>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </CardContent>
      </Card>

      {embedData && (
        <Card>
          <CardHeader>
            <CardTitle>Embed Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🐙</span>
                <span className="font-medium text-sm">{embedData.title}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{embedData.description}</p>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Open in GitHub →
              </a>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Raw Data:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(embedData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
