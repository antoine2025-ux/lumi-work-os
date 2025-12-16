"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare, Sparkles } from "lucide-react"

interface WelcomeCardProps {
  onCreateSession: (intent: 'doc_gen' | 'assist') => void
}

export function WelcomeCard({ onCreateSession }: WelcomeCardProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-muted">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm mb-4">
              Hello! I'm Loopwell AI, your intelligent assistant. What would you like to work on today?
            </p>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto p-4"
                onClick={() => onCreateSession('doc_gen')}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">📝 Generate Document</div>
                    <div className="text-sm text-muted-foreground">
                      I'll help you create comprehensive documents, policies, procedures, or guides. I'll ask targeted questions to gather requirements and generate a complete draft for you.
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto p-4"
                onClick={() => onCreateSession('assist')}
              >
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold">💡 General Assistance</div>
                    <div className="text-sm text-muted-foreground">
                      I'll help you find information, answer questions, and provide guidance on various topics using your existing knowledge base.
                    </div>
                  </div>
                </div>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Simply click your choice to get started!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
