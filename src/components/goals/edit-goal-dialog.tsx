'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { PeoplePicker } from '@/components/shared/people-picker'

interface Props {
  isOpen: boolean
  onClose: () => void
  goal: {
    id: string
    title: string
    description?: string | null
    status: string
    startDate: string | Date
    endDate: string | Date
    quarter?: string | null
    ownerId: string
    owner?: {
      id: string
      name: string | null
      email: string
    } | null
  }
}

export function EditGoalDialog({ isOpen, onClose, goal }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(goal.ownerId || null)
  const [formData, setFormData] = useState({
    title: goal.title,
    description: goal.description || '',
    status: goal.status,
    startDate: new Date(goal.startDate).toISOString().split('T')[0],
    endDate: new Date(goal.endDate).toISOString().split('T')[0],
    quarter: goal.quarter || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(ownerId && { ownerId }),
        }),
      })

      if (response.ok) {
        router.refresh()
        onClose()
      }
    } catch (error: unknown) {
      console.error('Failed to update goal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg border border-border shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Goal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1.5">
              Goal Title
            </label>
            <input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter goal title"
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the goal"
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Goal Owner
            </label>
            <PeoplePicker
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Select owner..."
              allowClear
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1.5">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1.5">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-1.5">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="quarter" className="block text-sm font-medium text-foreground mb-1.5">
              Quarter
            </label>
            <input
              id="quarter"
              value={formData.quarter}
              onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
              placeholder="2026-Q1"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
