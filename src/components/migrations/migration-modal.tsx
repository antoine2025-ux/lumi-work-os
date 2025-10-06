"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface MigrationModalProps {
  platform: string
  platformIcon: React.ReactNode
  description: string
  features: string[]
  onStartMigration: (apiKey: string, workspaceId: string, additionalConfig?: any) => Promise<void>
}

export function MigrationModal({ 
  platform, 
  platformIcon, 
  description, 
  features, 
  onStartMigration 
}: MigrationModalProps) {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleStartMigration = async () => {
    if (!apiKey.trim() || !workspaceId.trim()) {
      setErrorMessage("Please fill in all required fields")
      setStatus("error")
      return
    }

    setIsLoading(true)
    setStatus("idle")
    setErrorMessage("")

    try {
      const result = await onStartMigration(apiKey.trim(), workspaceId.trim())
      setStatus("success")
      
      // If there's a preview URL, redirect to it
      if (result.previewUrl) {
        setTimeout(() => {
          window.location.href = result.previewUrl
        }, 1500)
      } else {
        setTimeout(() => {
          setOpen(false)
          setApiKey("")
          setWorkspaceId("")
          setStatus("idle")
          setErrorMessage("")
        }, 2000)
      }
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Migration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "success":
        return "Migration completed successfully!"
      case "error":
        return errorMessage || "Migration failed. Please try again."
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Start Migration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {platformIcon}
            <span>{platform} Migration</span>
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What will be migrated:</h4>
            <ul className="space-y-1">
              {features.map((feature, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* API Credentials Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={`Enter your ${platform} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                You can find this in your {platform} account settings under API or Developer options
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID *</Label>
              <Input
                id="workspaceId"
                placeholder={`Enter your ${platform} workspace ID`}
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This is usually found in your workspace URL or settings
              </p>
            </div>
          </div>

          {/* Status Message */}
          {status !== "idle" && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              status === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartMigration}
              disabled={isLoading || !apiKey.trim() || !workspaceId.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
