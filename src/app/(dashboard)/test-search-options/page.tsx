"use client"

import React, { useState } from 'react'
import { Search, Filter, X, ChevronDown, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export default function TestSearchOptionsPage() {
  const [activeOption, setActiveOption] = useState<string>('option1')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [showOverlay, setShowOverlay] = useState(false)

  const mockTasks = [
    { id: '1', title: 'Design new homepage', status: 'TODO', priority: 'HIGH', assignee: 'John Doe' },
    { id: '2', title: 'Implement user authentication', status: 'IN_PROGRESS', priority: 'URGENT', assignee: 'Jane Smith' },
    { id: '3', title: 'Write API documentation', status: 'DONE', priority: 'MEDIUM', assignee: 'Bob Wilson' },
    { id: '4', title: 'Fix mobile responsive issues', status: 'IN_REVIEW', priority: 'HIGH', assignee: 'Alice Brown' },
    { id: '5', title: 'Setup CI/CD pipeline', status: 'BLOCKED', priority: 'LOW', assignee: 'Charlie Davis' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Placement Options</h1>
          <p className="text-gray-600">Choose the search interface that feels most natural for your workflow</p>
        </div>

        {/* Option Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Option to Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant={activeOption === 'option1' ? 'default' : 'outline'}
                onClick={() => setActiveOption('option1')}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <Search className="h-6 w-6" />
                <span className="text-sm">Collapsible Header</span>
              </Button>
              <Button
                variant={activeOption === 'option2' ? 'default' : 'outline'}
                onClick={() => setActiveOption('option2')}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <Filter className="h-6 w-6" />
                <span className="text-sm">Integrated Toggle</span>
              </Button>
              <Button
                variant={activeOption === 'option3' ? 'default' : 'outline'}
                onClick={() => setActiveOption('option3')}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <Search className="h-6 w-6" />
                <span className="text-sm">Floating Button</span>
              </Button>
              <Button
                variant={activeOption === 'option4' ? 'default' : 'outline'}
                onClick={() => setActiveOption('option4')}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <Command className="h-6 w-6" />
                <span className="text-sm">Keyboard Shortcut</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Area */}
        <Card className="min-h-[600px]">
          <CardHeader>
            <CardTitle>Preview: {activeOption === 'option1' ? 'Collapsible Header Search' : 
                              activeOption === 'option2' ? 'Integrated Toggle Search' :
                              activeOption === 'option3' ? 'Floating Search Button' : 
                              'Keyboard Shortcut Search'}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            
            {/* Option 1: Collapsible Header Search */}
            {activeOption === 'option1' && (
              <div className="space-y-6">
                {/* Tasks Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 rounded-lg p-1 bg-gray-100">
                      <Button variant="default" size="sm" className="h-7 px-3 text-xs">
                        Board
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                        Live
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                      <Search className="h-3 w-3 mr-1" />
                      Fullscreen
                    </Button>
                    {/* Search Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchExpanded(!searchExpanded)}
                      className="h-8 px-3 text-xs"
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Search
                    </Button>
                  </div>
                </div>

                {/* Collapsible Search Bar */}
                {searchExpanded && (
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search tasks by title, description, or assignee..."
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-1" />
                        Filters
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSearchExpanded(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mock Kanban Board */}
                <div className="grid grid-cols-5 gap-4">
                  {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((status, index) => (
                    <div key={status} className="bg-white rounded-lg border p-4 min-h-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{status}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).map(task => (
                          <div key={task.id} className="bg-gray-50 rounded p-2 text-xs">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-gray-500">{task.assignee}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Option 2: Integrated Toggle Search */}
            {activeOption === 'option2' && (
              <div className="space-y-6">
                {/* Tasks Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 rounded-lg p-1 bg-gray-100">
                      <Button variant="default" size="sm" className="h-7 px-3 text-xs">
                        Board
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                        Live
                      </Button>
                    </div>
                    {/* Search Dropdown */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchExpanded(!searchExpanded)}
                        className="h-8 px-3 text-xs"
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Search
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                      {searchExpanded && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-10 p-4">
                          <div className="space-y-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Search tasks..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" className="text-xs">Status</Button>
                              <Button variant="outline" size="sm" className="text-xs">Priority</Button>
                              <Button variant="outline" size="sm" className="text-xs">Assignee</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                      <Search className="h-3 w-3 mr-1" />
                      Fullscreen
                    </Button>
                  </div>
                </div>

                {/* Mock Kanban Board */}
                <div className="grid grid-cols-5 gap-4">
                  {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((status, index) => (
                    <div key={status} className="bg-white rounded-lg border p-4 min-h-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{status}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).map(task => (
                          <div key={task.id} className="bg-gray-50 rounded p-2 text-xs">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-gray-500">{task.assignee}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Option 3: Floating Search Button */}
            {activeOption === 'option3' && (
              <div className="space-y-6">
                {/* Tasks Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 rounded-lg p-1 bg-gray-100">
                      <Button variant="default" size="sm" className="h-7 px-3 text-xs">
                        Board
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                        Live
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                      <Search className="h-3 w-3 mr-1" />
                      Fullscreen
                    </Button>
                  </div>
                </div>

                {/* Mock Kanban Board */}
                <div className="grid grid-cols-5 gap-4">
                  {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((status, index) => (
                    <div key={status} className="bg-white rounded-lg border p-4 min-h-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{status}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).map(task => (
                          <div key={task.id} className="bg-gray-50 rounded p-2 text-xs">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-gray-500">{task.assignee}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Floating Search Button */}
                <Button
                  onClick={() => setShowOverlay(true)}
                  className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Search className="h-5 w-5" />
                </Button>

                {/* Search Overlay */}
                {showOverlay && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Search Tasks</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowOverlay(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search tasks..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="pl-10"
                            autoFocus
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="text-xs">Status</Button>
                          <Button variant="outline" size="sm" className="text-xs">Priority</Button>
                          <Button variant="outline" size="sm" className="text-xs">Assignee</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Option 4: Keyboard Shortcut Search */}
            {activeOption === 'option4' && (
              <div className="space-y-6">
                {/* Tasks Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 rounded-lg p-1 bg-gray-100">
                      <Button variant="default" size="sm" className="h-7 px-3 text-xs">
                        Board
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                        Live
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                      <Search className="h-3 w-3 mr-1" />
                      Fullscreen
                    </Button>
                  </div>
                </div>

                {/* Keyboard Shortcut Indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <Command className="h-4 w-4" />
                    <span className="text-sm font-medium">Press Cmd+K (or Ctrl+K) to search</span>
                  </div>
                </div>

                {/* Mock Kanban Board */}
                <div className="grid grid-cols-5 gap-4">
                  {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((status, index) => (
                    <div key={status} className="bg-white rounded-lg border p-4 min-h-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{status}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {mockTasks.filter(task => task.status === ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'][index]).map(task => (
                          <div key={task.id} className="bg-gray-50 rounded p-2 text-xs">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-gray-500">{task.assignee}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search Modal (triggered by keyboard shortcut) */}
                {showOverlay && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Quick Search</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
                          <span>to close</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Type to search..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="pl-10"
                            autoFocus
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Search across task titles, descriptions, and assignees
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Option Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Option 1: Collapsible Header</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Search icon in tasks header</li>
                <li>• Expands to full search bar when clicked</li>
                <li>• Collapses back to icon when not needed</li>
                <li>• Easy to find, doesn't clutter interface</li>
                <li>• Familiar pattern for most users</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Option 2: Integrated Toggle</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Search dropdown next to view buttons</li>
                <li>• Opens search panel when clicked</li>
                <li>• More contextual and less intrusive</li>
                <li>• Keeps search close to view controls</li>
                <li>• Good for power users</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Option 3: Floating Button</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Small floating button (bottom-right)</li>
                <li>• Opens search overlay when clicked</li>
                <li>• Completely out of the way until needed</li>
                <li>• Modern, mobile-friendly approach</li>
                <li>• Minimal visual footprint</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Command className="h-5 w-5" />
                <span>Option 4: Keyboard Shortcut</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Hidden search UI completely</li>
                <li>• Use Cmd/Ctrl + K to open search</li>
                <li>• Only shows indicator when active</li>
                <li>• Maximum screen real estate</li>
                <li>• Best for keyboard-heavy workflows</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Click on each option button above to see different search placements</p>
              <p>• For Option 1: Click the "Search" button to expand/collapse the search bar</p>
              <p>• For Option 2: Click the "Search" dropdown to see the search panel</p>
              <p>• For Option 3: Click the floating search button to see the overlay</p>
              <p>• For Option 4: Click anywhere to simulate the keyboard shortcut</p>
              <p>• Consider which feels most natural for your workflow and design aesthetic</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
