"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, X, User, Flag, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export interface TaskFilter {
  search: string
  status: string[]
  priority: string[]
  assignee: string[]
  hasDependencies: boolean | null
  isOverdue: boolean | null
}

export interface TaskSearchFilterProps {
  tasks: any[]
  onFilterChange: (filteredTasks: any[]) => void
  onFilterReset: () => void
}

export function TaskSearchFilter({ tasks, onFilterChange, onFilterReset }: TaskSearchFilterProps) {
  const [filters, setFilters] = useState<TaskFilter>({
    search: '',
    status: [],
    priority: [],
    assignee: [],
    hasDependencies: null,
    isOverdue: null
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Get unique values for filter options
  const uniqueStatuses = [...new Set(tasks.map(task => task.status))].filter(Boolean)
  const uniquePriorities = [...new Set(tasks.map(task => task.priority))].filter(Boolean)
  const uniqueAssignees = [...new Set(tasks.map(task => task.assignee?.name).filter(Boolean))]

  // Apply filters to tasks
  useEffect(() => {
    let filteredTasks = tasks

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.assignee?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.status.includes(task.status)
      )
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.priority.includes(task.priority)
      )
    }

    // Assignee filter
    if (filters.assignee.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.assignee && filters.assignee.includes(task.assignee.name)
      )
    }

    // Dependencies filter
    if (filters.hasDependencies !== null) {
      filteredTasks = filteredTasks.filter(task => 
        filters.hasDependencies ? task.dependsOn.length > 0 : task.dependsOn.length === 0
      )
    }

    // Overdue filter
    if (filters.isOverdue !== null) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.dueDate) return false
        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'DONE'
        return filters.isOverdue ? isOverdue : !isOverdue
      })
    }

    onFilterChange(filteredTasks)
  }, [filters, tasks, onFilterChange])

  // Count active filters
  useEffect(() => {
    let count = 0
    if (filters.search) count++
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.assignee.length > 0) count++
    if (filters.hasDependencies !== null) count++
    if (filters.isOverdue !== null) count++
    setActiveFiltersCount(count)
  }, [filters])

  const handleFilterChange = (key: keyof TaskFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleMultiSelectChange = (key: 'status' | 'priority' | 'assignee', value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: checked 
        ? [...prev[key], value]
        : prev[key].filter(item => item !== value)
    }))
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      status: [],
      priority: [],
      assignee: [],
      hasDependencies: null,
      isOverdue: null
    })
    onFilterReset()
  }

  const removeFilter = (key: keyof TaskFilter) => {
    if (key === 'search') {
      handleFilterChange('search', '')
    } else if (key === 'hasDependencies' || key === 'isOverdue') {
      handleFilterChange(key, null)
    } else {
      handleFilterChange(key, [])
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tasks by title, description, or assignee..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Search: "{filters.search}"</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('search')}
                />
              </Badge>
            )}
            {filters.status.map(status => (
              <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                <span>Status: {status}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleMultiSelectChange('status', status, false)}
                />
              </Badge>
            ))}
            {filters.priority.map(priority => (
              <Badge key={priority} variant="secondary" className="flex items-center space-x-1">
                <span>Priority: {priority}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleMultiSelectChange('priority', priority, false)}
                />
              </Badge>
            ))}
            {filters.assignee.map(assignee => (
              <Badge key={assignee} variant="secondary" className="flex items-center space-x-1">
                <span>Assignee: {assignee}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleMultiSelectChange('assignee', assignee, false)}
                />
              </Badge>
            ))}
            {filters.hasDependencies !== null && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Dependencies: {filters.hasDependencies ? 'Has' : 'No'}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('hasDependencies')}
                />
              </Badge>
            )}
            {filters.isOverdue !== null && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Overdue: {filters.isOverdue ? 'Yes' : 'No'}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('isOverdue')}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Flag className="h-4 w-4" />
                <span>Status</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueStatuses.map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.status.includes(status)}
                      onCheckedChange={(checked) => 
                        handleMultiSelectChange('status', status, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`status-${status}`}
                      className="text-sm cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Flag className="h-4 w-4" />
                <span>Priority</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniquePriorities.map(priority => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priority.includes(priority)}
                      onCheckedChange={(checked) => 
                        handleMultiSelectChange('priority', priority, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`priority-${priority}`}
                      className="text-sm cursor-pointer"
                    >
                      {priority}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Assignee</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uniqueAssignees.map(assignee => (
                  <div key={assignee} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${assignee}`}
                      checked={filters.assignee.includes(assignee)}
                      onCheckedChange={(checked) => 
                        handleMultiSelectChange('assignee', assignee, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`assignee-${assignee}`}
                      className="text-sm cursor-pointer"
                    >
                      {assignee}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.hasDependencies === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('hasDependencies', 
                    filters.hasDependencies === true ? null : true
                  )}
                >
                  Has Dependencies
                </Button>
                <Button
                  variant={filters.hasDependencies === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('hasDependencies', 
                    filters.hasDependencies === false ? null : false
                  )}
                >
                  No Dependencies
                </Button>
                <Button
                  variant={filters.isOverdue === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('isOverdue', 
                    filters.isOverdue === true ? null : true
                  )}
                >
                  Overdue Tasks
                </Button>
                <Button
                  variant={filters.isOverdue === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('isOverdue', 
                    filters.isOverdue === false ? null : false
                  )}
                >
                  Not Overdue
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
