'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'

interface KeyResultForm {
  title: string
  description: string
  metricType: 'PERCENT' | 'NUMBER' | 'BOOLEAN' | 'CURRENCY'
  currentValue: string
  targetValue: string
  unit: string
  dueDate: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  goalId: string
}

export function AddObjectiveDialog({ isOpen, onClose, goalId }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [objectiveData, setObjectiveData] = useState({
    title: '',
    description: '',
    weight: '1',
  })
  const [keyResults, setKeyResults] = useState<KeyResultForm[]>([
    {
      title: '',
      description: '',
      metricType: 'NUMBER' as const,
      currentValue: '0',
      targetValue: '',
      unit: '',
      dueDate: '',
    },
  ])

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      {
        title: '',
        description: '',
        metricType: 'NUMBER',
        currentValue: '0',
        targetValue: '',
        unit: '',
        dueDate: '',
      },
    ])
  }

  const removeKeyResult = (index: number) => {
    if (keyResults.length > 1) {
      setKeyResults(keyResults.filter((_, i) => i !== index))
    }
  }

  const updateKeyResult = (index: number, field: keyof KeyResultForm, value: string) => {
    const updated = [...keyResults]
    updated[index] = { ...updated[index], [field]: value }
    setKeyResults(updated)
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/goals/${goalId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: objectiveData.title,
          description: objectiveData.description,
          weight: parseFloat(objectiveData.weight),
          keyResults: keyResults.map(kr => ({
            title: kr.title,
            description: kr.description,
            metricType: kr.metricType,
            currentValue: parseFloat(kr.currentValue) || 0,
            targetValue: parseFloat(kr.targetValue),
            unit: kr.unit || undefined,
            dueDate: kr.dueDate || undefined,
          })),
        }),
      })

      if (response.ok) {
        router.refresh()
        onClose()
        // Reset form
        setStep(1)
        setObjectiveData({ title: '', description: '', weight: '1' })
        setKeyResults([{
          title: '',
          description: '',
          metricType: 'NUMBER',
          currentValue: '0',
          targetValue: '',
          unit: '',
          dueDate: '',
        }])
      }
    } catch (error) {
      console.error('Failed to create objective:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const canProceedToStep2 = objectiveData.title.trim().length > 0
  const canSubmit = keyResults.every(kr => kr.title.trim().length > 0 && kr.targetValue.trim().length > 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg border border-border shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Add Objective - Step {step} of 2
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="objective-title" className="block text-sm font-medium text-foreground mb-1.5">
                  Objective Title
                </label>
                <input
                  id="objective-title"
                  value={objectiveData.title}
                  onChange={(e) => setObjectiveData({ ...objectiveData, title: e.target.value })}
                  placeholder="Enter objective title"
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="objective-description" className="block text-sm font-medium text-foreground mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  id="objective-description"
                  value={objectiveData.description}
                  onChange={(e) => setObjectiveData({ ...objectiveData, description: e.target.value })}
                  placeholder="Describe the objective"
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="objective-weight" className="block text-sm font-medium text-foreground mb-1.5">
                  Weight (1-10)
                </label>
                <input
                  id="objective-weight"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={objectiveData.weight}
                  onChange={(e) => setObjectiveData({ ...objectiveData, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher weight means this objective has more impact on overall goal progress
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Next: Add Key Results
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Key Results</h3>
                <button
                  type="button"
                  onClick={addKeyResult}
                  className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Key Result
                </button>
              </div>

              <div className="space-y-6">
                {keyResults.map((kr, index) => (
                  <div key={index} className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Key Result {index + 1}
                      </span>
                      {keyResults.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKeyResult(index)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Title
                      </label>
                      <input
                        value={kr.title}
                        onChange={(e) => updateKeyResult(index, 'title', e.target.value)}
                        placeholder="Enter key result title"
                        required
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Description (Optional)
                      </label>
                      <textarea
                        value={kr.description}
                        onChange={(e) => updateKeyResult(index, 'description', e.target.value)}
                        placeholder="Describe how to measure this"
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Metric Type
                      </label>
                      <select
                        value={kr.metricType}
                        onChange={(e) => updateKeyResult(index, 'metricType', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      >
                        <option value="NUMBER">Number</option>
                        <option value="PERCENT">Percentage</option>
                        <option value="CURRENCY">Currency</option>
                        <option value="BOOLEAN">Yes/No</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Current Value
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={kr.currentValue}
                          onChange={(e) => updateKeyResult(index, 'currentValue', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={kr.targetValue}
                          onChange={(e) => updateKeyResult(index, 'targetValue', e.target.value)}
                          placeholder="100"
                          required
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Unit
                        </label>
                        <input
                          value={kr.unit}
                          onChange={(e) => updateKeyResult(index, 'unit', e.target.value)}
                          placeholder="%, users, $"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Due Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={kr.dueDate}
                        onChange={(e) => updateKeyResult(index, 'dueDate', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !canSubmit}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Objective'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
