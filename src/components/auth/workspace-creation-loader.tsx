"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, Sparkles } from "lucide-react"

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'complete'
}

export function WorkspaceCreationLoader() {
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: 'validating', label: 'Validating workspace details', status: 'loading' },
    { id: 'creating', label: 'Creating your workspace', status: 'pending' },
    { id: 'admin', label: 'Setting up admin privileges', status: 'pending' },
    { id: 'initializing', label: 'Initializing your workspace', status: 'pending' },
    { id: 'ready', label: 'Almost there!', status: 'pending' },
  ])
  const [startTime] = useState(() => Date.now())
  const minDuration = 4500 // 4.5 seconds minimum

  useEffect(() => {
    // Sequential workspace creation with minimum 4 seconds
    // Step 1: Validating (current)
    setTimeout(() => {
      updateStepStatus('validating', 'complete')
      updateStepStatus('creating', 'loading')
      
      // Step 2: Creating
      setTimeout(() => {
        updateStepStatus('creating', 'complete')
        updateStepStatus('admin', 'loading')
        
        // Step 3: Admin
        setTimeout(() => {
          updateStepStatus('admin', 'complete')
          updateStepStatus('initializing', 'loading')
          
          // Step 4: Initializing
          setTimeout(() => {
            updateStepStatus('initializing', 'complete')
            updateStepStatus('ready', 'loading')
            
          // Step 5: Ready - ensure minimum duration has elapsed
          const elapsed = Date.now() - startTime
          const remainingTime = Math.max(1000, minDuration - elapsed)
            setTimeout(() => {
              updateStepStatus('ready', 'complete')
            }, remainingTime)
          }, 800)
        }, 800)
      }, 800)
    }, 700)
  }, [startTime])

  const updateStepStatus = (id: string, status: 'pending' | 'loading' | 'complete') => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status } : step
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Workspace
          </h1>
          <p className="text-gray-600">
            We're setting up everything you need to get started
          </p>
        </div>

        {/* Loading Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-white shadow-sm border border-gray-100 transition-all duration-500"
              style={{
                opacity: step.status === 'pending' ? 0.4 : 1,
                transform: step.status === 'pending' ? 'translateX(-10px)' : 'translateX(0)',
                scale: step.status === 'loading' ? '1.02' : '1',
              }}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {step.status === 'complete' ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center ring-2 ring-green-200">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                ) : step.status === 'loading' ? (
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center ring-2 ring-purple-200">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-gray-300 rounded-full" />
                  </div>
                )}
              </div>

              {/* Label and Progress */}
              <div className="flex-1 space-y-2">
                <p className={`font-medium text-sm ${
                  step.status === 'complete' ? 'text-green-700' : 
                  step.status === 'loading' ? 'text-purple-700' : 
                  'text-gray-500'
                }`}>
                  {step.label}
                </p>
                
                {/* Progress Bar */}
                {step.status === 'loading' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-500 animate-pulse"
                      style={{ width: '75%' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>This will only take a moment...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

