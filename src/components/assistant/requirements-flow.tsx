"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ArrowRight } from "lucide-react"

interface RequirementsFlowProps {
  onComplete: (requirements: any) => void
  onUpdateSession: (updates: any) => void
}

const REQUIREMENT_QUESTIONS = [
  {
    key: 'title',
    label: 'Document Title',
    type: 'text',
    placeholder: 'e.g., Remote Work Policy',
    required: true
  },
  {
    key: 'purpose',
    label: 'Purpose',
    type: 'textarea',
    placeholder: 'What is the main purpose of this document?',
    required: true
  },
  {
    key: 'audience',
    label: 'Target Audience',
    type: 'select',
    options: [
      'All employees',
      'Management team',
      'New hires',
      'Specific department',
      'External stakeholders',
      'Other'
    ],
    required: true
  },
  {
    key: 'scope',
    label: 'Scope',
    type: 'textarea',
    placeholder: 'What does this document cover? What are the boundaries?',
    required: true
  },
  {
    key: 'structure',
    label: 'Preferred Structure',
    type: 'select',
    options: [
      'Policy format (purpose, scope, procedures)',
      'Guide format (overview, steps, examples)',
      'Manual format (detailed instructions)',
      'Reference format (quick lookup)',
      'Custom structure'
    ],
    required: true
  },
  {
    key: 'tone',
    label: 'Tone',
    type: 'select',
    options: [
      'Formal and professional',
      'Friendly and approachable',
      'Technical and detailed',
      'Concise and direct',
      'Conversational'
    ],
    required: true
  },
  {
    key: 'constraints',
    label: 'Special Requirements',
    type: 'textarea',
    placeholder: 'Any specific requirements, compliance needs, or constraints?',
    required: false
  }
]

export function RequirementsFlow({ onComplete, onUpdateSession }: RequirementsFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [requirements, setRequirements] = useState<Record<string, string>>({})
  const [customAudience, setCustomAudience] = useState('')
  const [customStructure, setCustomStructure] = useState('')

  const currentQuestion = REQUIREMENT_QUESTIONS[currentStep]
  const completedSteps = Object.keys(requirements).length
  const progress = (completedSteps / REQUIREMENT_QUESTIONS.length) * 100

  const handleNext = () => {
    if (currentStep < REQUIREMENT_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // All questions completed
      const finalRequirements = {
        ...requirements,
        ...(customAudience && { audience: customAudience }),
        ...(customStructure && { structure: customStructure })
      }
      onComplete(finalRequirements)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAnswer = (value: string) => {
    const newRequirements = { ...requirements, [currentQuestion.key]: value }
    setRequirements(newRequirements)
    
    // Update session with current progress
    onUpdateSession({
      phase: 'gathering_requirements',
      requirementNotes: newRequirements
    })
  }

  const canProceed = () => {
    if (currentQuestion.required) {
      return requirements[currentQuestion.key]?.trim() || 
             (currentQuestion.key === 'audience' && customAudience.trim()) ||
             (currentQuestion.key === 'structure' && customStructure.trim())
    }
    return true
  }

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'text':
        return (
          <Input
            value={requirements[currentQuestion.key] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder}
            className="w-full"
          />
        )
      
      case 'textarea':
        return (
          <Textarea
            value={requirements[currentQuestion.key] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder}
            className="w-full min-h-[100px]"
          />
        )
      
      case 'select':
        return (
          <div className="space-y-3">
            <Select
              value={requirements[currentQuestion.key] || ''}
              onValueChange={(value) => {
                if (value === 'Other') {
                  handleAnswer('')
                } else {
                  handleAnswer(value)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {currentQuestion.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {requirements[currentQuestion.key] === 'Other' && (
              <Input
                value={currentQuestion.key === 'audience' ? customAudience : customStructure}
                onChange={(e) => {
                  if (currentQuestion.key === 'audience') {
                    setCustomAudience(e.target.value)
                  } else {
                    setCustomStructure(e.target.value)
                  }
                }}
                placeholder={`Specify ${currentQuestion.key === 'audience' ? 'audience' : 'structure'}`}
                className="w-full"
              />
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <CheckCircle className="h-5 w-5" />
          <span>Document Requirements</span>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress: {completedSteps} of {REQUIREMENT_QUESTIONS.length} questions</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-blue-900 mb-2">
            {currentQuestion.label}
            {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {renderQuestion()}
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === REQUIREMENT_QUESTIONS.length - 1 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
