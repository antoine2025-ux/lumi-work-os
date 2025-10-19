"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"

export default function TestSlitePage() {
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const testSliteConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key")
      return
    }

    setIsLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch('/api/test-slite-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Test failed')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Slite API Connection</h1>
        <p className="text-muted-foreground">
          Test your Slite API key before running a migration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key Test</CardTitle>
          <CardDescription>
            Enter your Slite API key to test the connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Slite API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Slite API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your Slite account settings under API or Developer options
            </p>
          </div>

          <Button 
            onClick={testSliteConnection}
            disabled={isLoading || !apiKey.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Connection Failed</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700 mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connection Successful!</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-green-800">User Information:</h4>
                <p className="text-green-700">
                  {result.meData?.name || 'Unknown'} ({result.meData?.email || 'No email'})
                </p>
              </div>

              <div>
                <h4 className="font-medium text-green-800">Notes Found:</h4>
                <Badge className="bg-green-600">
                  {result.notesCount} notes available for migration
                </Badge>
              </div>

              {result.notesCount > 0 && (
                <div>
                  <h4 className="font-medium text-green-800">Sample Notes:</h4>
                  <div className="space-y-2 mt-2">
                    {result.searchData?.notes?.slice(0, 3).map((note: any, index: number) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        <p className="font-medium">{note.title || 'Untitled'}</p>
                        <p className="text-sm text-gray-600">
                          Created: {new Date(note.created_at || note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => window.location.href = '/settings'}
                  className="w-full"
                >
                  Go to Migration Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

