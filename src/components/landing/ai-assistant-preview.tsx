"use client"

import { Badge } from "@/components/ui/badge"
import { Brain, Send, Sparkles } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  actions?: string[]
}

const mockMessages: Message[] = [
  {
    id: "1",
    role: "user" as const,
    content: "Hey Loopwell, what's holding up the Q1 product launch timeline? I feel like progress has slowed but I'm not sure where the bottleneck is.",
  },
  {
    id: "2",
    role: "assistant" as const,
    content:
      "I've reviewed the Q1 Product Launch workspace and found two key blockers:\n\n**1. Design Review (Task #142)** is waiting on final feedback from Emily Chen since last Tuesday.\n\n**2. Marketing Campaign Assets** are 60% complete, but the content team paused until they receive the finalized visuals.\n\nBased on your last meeting notes from \"Launch Sync – Jan 24\", Emily mentioned she'd need updated metrics from the analytics team before signing off.\n\nI suggest reaching out to **David Ortiz in Analytics** — he completed those numbers yesterday.\n\nWould you like me to summarize them for Emily and schedule a quick 15-minute call?",
    actions: ["Summarize & Schedule", "View Task Details"],
  },
  {
    id: "3",
    role: "user" as const,
    content: "Yes, do that — and include the new engagement data in the summary.",
  },
  {
    id: "4",
    role: "assistant" as const,
    content:
      "Got it. Here's a brief draft for review before I send it:\n\n**Subject:** Updated metrics for design approval\n\nHi Emily,\n\nThe analytics report now includes the latest engagement data from the beta release.\n\nYou can view the summary here → [View Report].\n\nOnce approved, Marketing can proceed with asset finalization.\n\nWould you like me to attach the report and send it via Slack or email?",
    actions: ["Send via Slack", "Send via Email", "Edit Message"],
  },
  {
    id: "5",
    role: "user" as const,
    content: "Send it on Slack — she'll see it faster.",
  },
  {
    id: "6",
    role: "assistant" as const,
    content:
      "Done ✅\n\nMessage sent to Emily Chen (Design) in the #product-launch channel.\n\nI'll remind her tomorrow if there's no response and update the task status automatically.",
    actions: [],
  },
]

export function AIAssistantPreview() {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const componentRef = useRef<HTMLDivElement>(null)

  // Check if component is visible in viewport using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1 } // Start when 10% visible
    )

    if (componentRef.current) {
      observer.observe(componentRef.current)
    }

    return () => {
      if (componentRef.current) {
        observer.unobserve(componentRef.current)
      }
    }
  }, [isVisible])

  // Auto-scroll to bottom when new messages appear (only within container)
  useEffect(() => {
    if (messagesEndRef.current && containerRef.current) {
      // Only scroll within the container, not the page
      const container = containerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [visibleMessages])

  // Reveal messages sequentially - only start when component is visible
  useEffect(() => {
    if (!isVisible) return

    if (currentIndex < mockMessages.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, mockMessages[currentIndex]])
        setCurrentIndex(prev => prev + 1)
      }, currentIndex === 0 ? 800 : 2500) // Wait 800ms for first message, 2.5s for others to allow reading
      
      return () => clearTimeout(timer)
    }
  }, [currentIndex, isVisible])

  // Reset animation when component becomes visible
  useEffect(() => {
    if (isVisible) {
      setVisibleMessages([])
      setCurrentIndex(0)
    }
  }, [isVisible])

  return (
    <div ref={componentRef} className="bg-slate-800 rounded-lg border border-slate-700 p-6 h-[700px] flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          <p className="text-xs text-slate-400">powered by Loopwell.</p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            <Sparkles className="w-3 h-3 mr-1" />
            Online
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
        {visibleMessages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]`}
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 text-slate-100 border border-slate-700"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="space-y-3">
                  <div className="text-sm whitespace-pre-line text-slate-100">
                    {message.content.split('\n').map((line, idx) => {
                      // Handle bold text **text**
                      const parts = line.split(/(\*\*.*?\*\*)/g)
                      return (
                        <div key={idx} className="mb-1">
                          {parts.map((part, partIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={partIdx} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                            }
                            return <span key={partIdx}>{part}</span>
                          })}
                        </div>
                      )
                    })}
                  </div>
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                      {message.actions.map((action, idx) => (
                        <button
                          key={idx}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                            idx === 0
                              ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30"
                              : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.id === "6" && (
                    <div className="pt-2 border-t border-slate-700">
                      <div className="flex items-center space-x-2 text-xs text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Task status will update automatically</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ask about projects, tasks, meetings, or team members..."
          className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Quick Suggestions */}
      <div className="flex flex-wrap gap-2 mt-2">
        <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-md text-xs transition-colors border border-slate-700">
          What's blocking my projects?
        </button>
        <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-md text-xs transition-colors border border-slate-700">
          Summarize last meeting
        </button>
        <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-md text-xs transition-colors border border-slate-700">
          Who should I follow up with?
        </button>
      </div>
      
      {/* Context Indicator */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Sparkles className="w-3 h-3" />
          <span>Connecting tasks, meetings, and team members across your workspace</span>
        </div>
      </div>
    </div>
  )
}

