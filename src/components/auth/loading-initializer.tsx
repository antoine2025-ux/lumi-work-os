"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'complete'
}

export function LoadingInitializer() {
  const { data: session, status: sessionStatus } = useSession()
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: 'session', label: 'Establishing session', status: 'loading' },
    { id: 'workspace', label: 'Loading workspace', status: 'pending' },
    { id: 'projects', label: 'Loading projects', status: 'pending' },
    { id: 'wiki', label: 'Loading wiki', status: 'pending' },
    { id: 'ready', label: 'Almost ready', status: 'pending' },
  ])
  const [startTime] = useState(() => Date.now())
  const [isComplete, setIsComplete] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  // Prefetch dashboard data in the background and track completion
  const prefetchDashboardData = useCallback(async (wsId: string) => {
    console.log('[LoadingInitializer] Starting dashboard data prefetch for workspace:', wsId)
    
    // Start all prefetch requests in parallel
    const promises = [
      // Prefetch projects
      fetch(`/api/projects?workspaceId=${wsId}`)
        .then(() => console.log('[LoadingInitializer] ✓ Projects prefetched'))
        .catch(err => console.error('[LoadingInitializer] ✗ Projects prefetch failed:', err)),
      
      // Prefetch wiki pages
      fetch(`/api/wiki/pages?workspaceId=${wsId}`)
        .then(() => console.log('[LoadingInitializer] ✓ Wiki pages prefetched'))
        .catch(err => console.error('[LoadingInitializer] ✗ Wiki pages prefetch failed:', err)),
      
      // Prefetch calendar events
      fetch('/api/calendar/events')
        .then(() => console.log('[LoadingInitializer] ✓ Calendar events prefetched'))
        .catch(err => console.error('[LoadingInitializer] ✗ Calendar events prefetch failed:', err))
    ]
    
    // Wait for all to complete (or timeout after 4 seconds)
    try {
      await Promise.allSettled(promises)
      console.log('[LoadingInitializer] All dashboard data prefetching complete')
    } catch (error) {
      console.error('[LoadingInitializer] Some prefetch requests failed:', error)
    }
  }, [])

  // Get workspace ID and prefetch dashboard data
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const data = await response.json()
          if (data.workspaceId) {
            setWorkspaceId(data.workspaceId)
            // Start prefetching dashboard data in the background
            // Don't await - let it run in parallel with the loading animation
            prefetchDashboardData(data.workspaceId)
          }
        }
      } catch (error) {
        console.error('[LoadingInitializer] Error fetching workspace ID:', error)
      }
    }

    if (sessionStatus === 'authenticated') {
      fetchWorkspaceId()
    }
  }, [sessionStatus, prefetchDashboardData])

  useEffect(() => {
    const minDuration = 5500 // 5.5 seconds minimum - enough time for APIs to complete
    
    // Update steps based on session status
    if (sessionStatus === 'authenticated') {
      updateStepStatus('session', 'complete')
      setTimeout(() => {
      updateStepStatus('workspace', 'loading')
        // After workspace loads, continue with other steps
        setTimeout(() => {
          updateStepStatus('workspace', 'complete')
          updateStepStatus('projects', 'loading')
          setTimeout(() => {
            updateStepStatus('projects', 'complete')
            updateStepStatus('wiki', 'loading')
            setTimeout(() => {
              updateStepStatus('wiki', 'complete')
              updateStepStatus('ready', 'loading')
              // Final step - ensure minimum 5.5 seconds have elapsed
              const elapsed = Date.now() - startTime
              const remainingTime = Math.max(1200, minDuration - elapsed)
              setTimeout(() => {
                updateStepStatus('ready', 'complete')
                // Signal completion after minimum time
                setTimeout(() => {
                  setIsComplete(true)
                }, 500)
              }, remainingTime)
            }, 900) // Longer delay for wiki
          }, 900) // Longer delay for projects
        }, 1200) // Longer delay for workspace
      }, 700) // Longer initial delay
    } else if (sessionStatus === 'loading') {
      updateStepStatus('session', 'loading')
    }
  }, [sessionStatus, startTime])

  const updateStepStatus = (id: string, status: 'pending' | 'loading' | 'complete') => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status } : step
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            {sessionStatus === 'authenticated' ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {sessionStatus === 'authenticated' ? 'Welcome back!' : 'Setting things up...'}
          </h1>
          <p className="text-gray-600">
            {sessionStatus === 'authenticated' 
              ? 'Getting your workspace ready' 
              : 'Please wait while we initialize your session'}
          </p>
        </div>

        {/* Loading Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-white shadow-sm border border-gray-100 transition-all duration-300"
              style={{
                opacity: step.status === 'pending' ? 0.5 : 1,
                transform: step.status === 'pending' ? 'translateX(-10px)' : 'translateX(0)',
              }}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {step.status === 'complete' ? (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ) : step.status === 'loading' ? (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={`font-medium ${
                  step.status === 'complete' ? 'text-green-700' : 
                  step.status === 'loading' ? 'text-blue-700' : 
                  'text-gray-500'
                }`}>
                  {step.label}
                </p>
              </div>

              {/* Progress Bar (optional indicator) */}
              {step.status === 'loading' && (
                <div className="flex-shrink-0 w-12">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full animate-pulse"
                      style={{ width: '60%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {sessionStatus === 'authenticated' 
              ? 'Almost there, just a few more seconds...' 
              : 'This should only take a moment'}
          </p>
        </div>
      </div>
    </div>
  )
}

