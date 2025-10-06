"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, XCircle } from "lucide-react"

interface DocumentCreationConfirmationProps {
  onConfirm: () => void
  onCancel: () => void
  documentType?: string
  suggestedTitle?: string
}

export function DocumentCreationConfirmation({ 
  onConfirm, 
  onCancel, 
  documentType = "document",
  suggestedTitle 
}: DocumentCreationConfirmationProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-sm">Create Wiki Page</h4>
              <p className="text-sm text-muted-foreground">
                Would you like me to create a wiki page for this {documentType}?
              </p>
              {suggestedTitle && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Suggested title: {suggestedTitle}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={onConfirm}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="h-3 w-3" />
                <span>Yes, Create Wiki</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onCancel}
                className="flex items-center space-x-1"
              >
                <XCircle className="h-3 w-3" />
                <span>No, Thanks</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
