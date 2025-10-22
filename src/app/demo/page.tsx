"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MinimalBoard, FocusBoard } from '@/components/demo/kanban'
import { LayoutGrid, Focus } from 'lucide-react'

export default function DemoPage() {
  const [activeView, setActiveView] = useState<'minimal' | 'focus'>('minimal')

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Demo Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-800">
                Kanban Board Demos
              </h1>
              <p className="text-neutral-600 mt-1">
                Two minimalistic, calm, and modern board experiences
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={activeView === 'minimal' ? 'default' : 'outline'}
                onClick={() => setActiveView('minimal')}
                className="flex items-center space-x-2"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Minimal Board</span>
              </Button>
              <Button
                variant={activeView === 'focus' ? 'default' : 'outline'}
                onClick={() => setActiveView('focus')}
                className="flex items-center space-x-2"
              >
                <Focus className="h-4 w-4" />
                <span>Focus Board</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="relative">
        {activeView === 'minimal' && <MinimalBoard />}
        {activeView === 'focus' && <FocusBoard />}
      </div>

      {/* Demo Info Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LayoutGrid className="h-5 w-5" />
                <span>Minimal Board View</span>
              </CardTitle>
              <CardDescription>
                Visually clean and breathable design inspired by Notion + Linear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• Light neutral background with soft shadows</li>
                <li>• 5-column grid layout with smooth transitions</li>
                <li>• Hover effects reveal additional task details</li>
                <li>• Floating "+" icons for adding tasks</li>
                <li>• Gentle entry animations with Framer Motion</li>
                <li>• Circular status icons and clean typography</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Focus className="h-5 w-5" />
                <span>Focus Board View</span>
              </CardTitle>
              <CardDescription>
                Calm single-column view for focused work sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• One column visible at a time with dropdown selection</li>
                <li>• Animated transitions between statuses</li>
                <li>• Centered layout with fixed max width</li>
                <li>• Larger task cards with progress rings</li>
                <li>• Backdrop blur effect for focused workspace</li>
                <li>• Enhanced task details and due date warnings</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
