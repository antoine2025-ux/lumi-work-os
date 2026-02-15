'use client'

import { useState, useEffect } from 'react'
import {
  Zap, Plus, Power, PowerOff, Loader2,
  AlertTriangle, Clock, CheckCircle, TrendingDown, Users,
} from 'lucide-react'

interface WorkflowRule {
  id: string
  name: string
  trigger: string
  conditions: Record<string, unknown>
  actions: Array<{ type: string; params: Record<string, unknown> }>
  isActive: boolean
  createdAt: string
}

interface Props {
  workspaceSlug: string
}

const TRIGGER_CONFIG: Record<string, { label: string; icon: typeof AlertTriangle; description: string }> = {
  GOAL_PROGRESS_STALLED: {
    label: 'Progress Stalled',
    icon: TrendingDown,
    description: 'When a goal stops making progress',
  },
  GOAL_AT_RISK: {
    label: 'Goal At Risk',
    icon: AlertTriangle,
    description: 'When a goal\'s risk score exceeds threshold',
  },
  PROJECT_COMPLETION: {
    label: 'Project Completed',
    icon: CheckCircle,
    description: 'When a linked project is completed',
  },
  DEADLINE_APPROACHING: {
    label: 'Deadline Approaching',
    icon: Clock,
    description: 'When a goal\'s deadline is near and progress is low',
  },
  STAKEHOLDER_UPDATE_REQUIRED: {
    label: 'Update Required',
    icon: Users,
    description: 'When stakeholders haven\'t been updated recently',
  },
}

const ACTION_TYPES = [
  { value: 'notify_stakeholders', label: 'Notify Stakeholders' },
  { value: 'escalate_goal', label: 'Escalate Goal' },
  { value: 'adjust_timeline', label: 'Adjust Timeline' },
  { value: 'update_status', label: 'Update Status' },
]

export function WorkflowRulesManager(_props: Props) {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('GOAL_AT_RISK')
  const [actionType, setActionType] = useState('notify_stakeholders')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const response = await fetch('/api/goals/workflows')
      if (response.ok) {
        setRules(await response.json())
      }
    } catch {
      // Endpoint may not exist yet
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/goals/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          trigger,
          conditions: {},
          actions: [{
            type: actionType,
            params: { message: actionMessage || `Automated: ${name}` },
          }],
        }),
      })

      if (response.ok) {
        setShowCreate(false)
        setName('')
        setActionMessage('')
        loadRules()
      }
    } catch {
      console.error('Failed to create workflow rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Workflow Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automate actions when goals meet specific conditions
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Rule Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Notify when goal is at risk"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Trigger</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(TRIGGER_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                const isSelected = trigger === key
                return (
                  <button
                    key={key}
                    onClick={() => setTrigger(key)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {config.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary transition-colors"
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Message</label>
              <input
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Optional message..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 && !showCreate ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-medium text-foreground mb-1">No Workflow Rules</h3>
          <p className="text-sm text-muted-foreground">
            Create automated rules to take action when goals meet specific conditions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const triggerConfig = TRIGGER_CONFIG[rule.trigger]
            const Icon = triggerConfig?.icon ?? Zap

            return (
              <div
                key={rule.id}
                className={`bg-card rounded-lg border p-4 transition-colors ${
                  rule.isActive ? 'border-border' : 'border-border opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-medium text-foreground">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Trigger: {triggerConfig?.label ?? rule.trigger}
                        {' | '}
                        {rule.actions.length} action(s)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      rule.isActive
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {rule.isActive ? (
                        <><Power className="w-3 h-3" /> Active</>
                      ) : (
                        <><PowerOff className="w-3 h-3" /> Inactive</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
