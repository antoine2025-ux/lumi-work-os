'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLoopbrainAssistant } from '@/components/loopbrain/assistant-context'
import { cn } from '@/lib/utils'

const WELCOME_DISMISSED_KEY = 'loopbrain_welcome_v1_dismissed'

interface StarterPrompt {
  label: string
  prompt: string
}

interface WelcomeConfig {
  greeting: string
  body: string
  starters: StarterPrompt[]
}

function getWelcomeConfig(companyType: string | null | undefined, userName: string): WelcomeConfig {
  const name = userName || 'there'

  switch (companyType) {
    case 'saas':
      return {
        greeting: `Welcome, ${name}!`,
        body: `As a SaaS company, I can help you track engineering capacity, surface project blockers early, and keep your roadmap on track.`,
        starters: [
          { label: "Who's overloaded this sprint?", prompt: "Who's overloaded this sprint?" },
          { label: "What's blocking the current release?", prompt: "What's blocking the current release?" },
          { label: 'Show me project health across the team', prompt: 'Give me a health summary for all active projects' },
        ],
      }
    case 'agency':
      return {
        greeting: `Welcome, ${name}!`,
        body: `As an agency, I can help you monitor client delivery, track team capacity across accounts, and flag projects at risk before they slip.`,
        starters: [
          { label: 'Which client projects are at risk?', prompt: 'Which client projects are at risk this week?' },
          { label: "Who's over-allocated across accounts?", prompt: "Which team members are over-allocated across client accounts?" },
          { label: 'Summarize this week\'s deliverables', prompt: "Summarize this week's deliverables across all active projects" },
        ],
      }
    case 'ecommerce':
      return {
        greeting: `Welcome, ${name}!`,
        body: `For e-commerce operations, I can help you track launch readiness, coordinate cross-functional work, and surface blockers before peak seasons.`,
        starters: [
          { label: "What's blocking the next launch?", prompt: "What's blocking our next product launch?" },
          { label: 'Show me open ops tasks this week', prompt: 'What are the highest priority operations tasks open this week?' },
          { label: 'Who owns the current campaign work?', prompt: 'Who is responsible for the current marketing campaign tasks?' },
        ],
      }
    case 'healthcare':
      return {
        greeting: `Welcome, ${name}!`,
        body: `For healthcare organizations, I can help you coordinate operational work, track initiative progress, and keep your team aligned across departments.`,
        starters: [
          { label: 'What initiatives are on track?', prompt: 'Which initiatives are on track and which are behind?' },
          { label: 'Show department workload summary', prompt: 'Give me a workload summary across all departments' },
          { label: 'Who are the owners for compliance work?', prompt: 'Who owns the open compliance-related tasks?' },
        ],
      }
    case 'financial':
      return {
        greeting: `Welcome, ${name}!`,
        body: `For financial services teams, I can help you track regulatory initiatives, monitor project delivery risk, and surface accountability gaps.`,
        starters: [
          { label: 'What regulatory projects are open?', prompt: 'What regulatory or compliance projects are currently open?' },
          { label: 'Which projects are behind schedule?', prompt: 'Which projects are currently behind their planned milestones?' },
          { label: 'Show me team accountability gaps', prompt: 'Are there any projects or tasks without clear owners?' },
        ],
      }
    case 'manufacturing':
      return {
        greeting: `Welcome, ${name}!`,
        body: `For manufacturing and hardware teams, I can help you track production milestones, coordinate cross-functional launches, and flag capacity risks.`,
        starters: [
          { label: 'What milestones are coming up?', prompt: 'What are the upcoming project milestones in the next two weeks?' },
          { label: 'Show me capacity by team', prompt: 'Give me a capacity overview by team' },
          { label: "Which launches are at risk?", prompt: "Which upcoming product launches or deliveries are at risk?" },
        ],
      }
    default:
      return {
        greeting: `Welcome, ${name}!`,
        body: `I'm Loopbrain, your AI work intelligence assistant. I can help you track projects, understand team capacity, and surface important work across your organization.`,
        starters: [
          { label: "What's my team working on?", prompt: "Give me a summary of what my team is working on this week" },
          { label: 'Show me projects at risk', prompt: 'Which projects are currently at risk or behind?' },
          { label: 'Summarize open work', prompt: 'Summarize all open tasks and who owns them' },
        ],
      }
  }
}

interface LoopbrainWelcomeCardProps {
  companyType?: string | null
  userName?: string
  userId?: string
  className?: string
}

export function LoopbrainWelcomeCard({
  companyType,
  userName,
  userId,
  className,
}: LoopbrainWelcomeCardProps) {
  const [visible, setVisible] = useState(false)
  const { setIsOpen, setPendingQuery } = useLoopbrainAssistant()

  useEffect(() => {
    const key = userId ? `${WELCOME_DISMISSED_KEY}_${userId}` : WELCOME_DISMISSED_KEY
    const dismissed = localStorage.getItem(key)
    if (!dismissed) {
      setVisible(true)
    }
  }, [userId])

  const dismiss = () => {
    const key = userId ? `${WELCOME_DISMISSED_KEY}_${userId}` : WELCOME_DISMISSED_KEY
    localStorage.setItem(key, '1')
    setVisible(false)
  }

  const handlePromptClick = (prompt: string) => {
    setPendingQuery(prompt)
    setIsOpen(true)
  }

  if (!visible) return null

  const config = getWelcomeConfig(companyType, userName ?? '')

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-primary/5 to-background', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{config.greeting}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{config.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {config.starters.map(s => (
                  <Button
                    key={s.label}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 px-3 text-xs font-normal whitespace-normal text-left"
                    onClick={() => handlePromptClick(s.prompt)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={dismiss}
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
