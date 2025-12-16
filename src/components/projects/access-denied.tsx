"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Users, Copy } from "lucide-react"
import { useState } from "react"

interface AccessDeniedProps {
  projectName?: string
  projectSpaceName?: string
  isAdminOrOwner: boolean
  onManageMembers?: () => void
}

export function AccessDenied({ 
  projectName, 
  projectSpaceName,
  isAdminOrOwner,
  onManageMembers 
}: AccessDeniedProps) {
  const [copied, setCopied] = useState(false)

  const handleRequestAccess = () => {
    const message = `Hi, I'd like to request access to the project "${projectName || 'this project'}"${projectSpaceName ? ` in the "${projectSpaceName}" ProjectSpace` : ''}. Could you please add me?`
    
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback: show alert with message
      alert(`Please send this message to your workspace administrator:\n\n${message}`)
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <CardTitle>Access Restricted</CardTitle>
          </div>
          <CardDescription>
            You don't have access to this ProjectSpace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {projectSpaceName ? (
              <>
                This project is in the <strong>"{projectSpaceName}"</strong> ProjectSpace, which is set to <strong>TARGETED</strong> visibility.
                Only members explicitly added to this ProjectSpace can access projects within it.
              </>
            ) : (
              <>
                This project is in a <strong>TARGETED</strong> ProjectSpace.
                Only members explicitly added to this ProjectSpace can access projects within it.
              </>
            )}
          </p>
          
          <p className="text-sm text-muted-foreground">
            {isAdminOrOwner ? (
              "As a workspace administrator, you can manage ProjectSpace members to grant access."
            ) : (
              "Please ask a workspace administrator or project owner to add you to this ProjectSpace."
            )}
          </p>

          <div className="flex gap-2 pt-2">
            {isAdminOrOwner && onManageMembers ? (
              <Button onClick={onManageMembers} className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Manage ProjectSpace Members
              </Button>
            ) : (
              <Button onClick={handleRequestAccess} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Request Access"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
