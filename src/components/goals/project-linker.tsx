'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link as LinkIcon, Plus, X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AvailableProject {
  id: string
  name: string
  status: string
  description?: string | null
}

interface Props {
  goalId: string
  linkedProjects: Array<{
    id: string
    contributionType?: string
    expectedImpact?: number
    autoUpdate?: boolean
    project: {
      id: string
      name: string
      status: string
      description?: string | null
    }
  }>
  workspaceSlug: string
}

export function ProjectLinker({ goalId, linkedProjects, workspaceSlug }: Props) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [contributionType, setContributionType] = useState<'REQUIRED' | 'CONTRIBUTING' | 'SUPPORTING'>('CONTRIBUTING')
  const [expectedImpact, setExpectedImpact] = useState(50)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [linkingProject, setLinkingProject] = useState(false)
  const [unlinkingProject, setUnlinkingProject] = useState<string | null>(null)

  // Stable key so useCallback doesn't change every render (avoids fetch loop)
  const linkedIdsKey = useMemo(
    () => linkedProjects.map(lp => lp.project.id).sort().join(','),
    [linkedProjects]
  )

  const loadAvailableProjects = useCallback(async () => {
    const idsSet = new Set(linkedIdsKey ? linkedIdsKey.split(',') : [])
    setIsLoadingProjects(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        const projectsList = data.projects || []
        const filtered = projectsList.filter((p: AvailableProject) => !idsSet.has(p.id))
        setAvailableProjects(filtered)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [linkedIdsKey])

  useEffect(() => {
    if (isModalOpen) {
      loadAvailableProjects()
    }
  }, [isModalOpen, loadAvailableProjects])

  const handleLinkProject = async () => {
    if (!selectedProject) return

    setLinkingProject(true)
    try {
      const response = await fetch(`/api/goals/${goalId}/link-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          contributionType,
          expectedImpact,
          autoUpdate,
        }),
      })
      if (response.ok) {
        router.refresh()
        setIsModalOpen(false)
        setSelectedProject('')
        setSearchQuery('')
        setContributionType('CONTRIBUTING')
        setExpectedImpact(50)
        setAutoUpdate(true)
      }
    } catch (error) {
      console.error('Failed to link project:', error)
    } finally {
      setLinkingProject(false)
    }
  }

  const handleUnlinkProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Unlink "${projectName}" from this goal?`)) {
      return
    }

    setUnlinkingProject(projectId)
    try {
      const response = await fetch(`/api/goals/${goalId}/link-project?projectId=${projectId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to unlink project:', error)
    } finally {
      setUnlinkingProject(null)
    }
  }

  const filteredProjects = availableProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 text-green-400'
      case 'ON_HOLD':
        return 'bg-orange-500/10 text-orange-400'
      case 'COMPLETED':
        return 'bg-blue-500/10 text-blue-400'
      case 'CANCELLED':
        return 'bg-muted/50 text-muted-foreground'
      default:
        return 'bg-muted/50 text-muted-foreground'
    }
  }

  const getContributionTypeBadge = (type?: string) => {
    switch (type) {
      case 'REQUIRED':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'CONTRIBUTING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'SUPPORTING':
        return 'bg-muted/50 text-muted-foreground border-border'
      default:
        return 'bg-muted/50 text-muted-foreground border-border'
    }
  }

  const getContributionTypeLabel = (type?: string) => {
    switch (type) {
      case 'REQUIRED':
        return 'Required'
      case 'CONTRIBUTING':
        return 'Contributing'
      case 'SUPPORTING':
        return 'Supporting'
      default:
        return 'Unknown'
    }
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
              <LinkIcon className="w-5 h-5" />
              Linked Projects
            </h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Link Project
            </button>
          </div>

          {/* Linked Projects List */}
          {linkedProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">No projects linked yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedProjects.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Link
                      href={`/w/${workspaceSlug}/projects/${link.project.id}`}
                      className="font-medium hover:text-primary transition-colors text-foreground"
                    >
                      {link.project.name}
                    </Link>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(link.project.status)}`}>
                      {link.project.status}
                    </span>
                    {link.contributionType && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getContributionTypeBadge(link.contributionType)}`}>
                        {getContributionTypeLabel(link.contributionType)}
                      </span>
                    )}
                    {link.expectedImpact !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        Impact: {link.expectedImpact}%
                      </span>
                    )}
                    {link.autoUpdate && (
                      <span className="text-xs text-muted-foreground">
                        Auto-sync
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnlinkProject(link.project.id, link.project.name)}
                    disabled={unlinkingProject === link.project.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Link Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-card rounded-lg border border-border shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Link Project to Goal</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Project
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-10 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>

                {isLoadingProjects ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading projects...
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {searchQuery ? 'No projects found' : 'No available projects'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedProject(project.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedProject === project.id
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'bg-muted/30 border border-border hover:border-primary'
                        }`}
                      >
                        <div className="font-medium text-foreground">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {project.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProject && (
                <>
                  {/* Contribution Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Contribution Type
                    </label>
                    <select
                      value={contributionType}
                      onChange={(e) => setContributionType(e.target.value as 'REQUIRED' | 'CONTRIBUTING' | 'SUPPORTING')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    >
                      <option value="REQUIRED">Required - Must complete for goal success</option>
                      <option value="CONTRIBUTING">Contributing - Significantly impacts goal</option>
                      <option value="SUPPORTING">Supporting - Minor contribution</option>
                    </select>
                  </div>

                  {/* Expected Impact */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Expected Impact: {expectedImpact}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={expectedImpact}
                      onChange={(e) => setExpectedImpact(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>No impact</span>
                      <span>High impact</span>
                    </div>
                  </div>

                  {/* Auto Update */}
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={autoUpdate}
                      onChange={(e) => setAutoUpdate(e.target.checked)}
                      className="mt-1 mr-2"
                      id="auto-update"
                    />
                    <label htmlFor="auto-update" className="text-sm text-foreground cursor-pointer">
                      <div className="font-medium">Automatically update goal progress</div>
                      <div className="text-muted-foreground">
                        When project tasks complete, goal progress updates automatically
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLinkProject}
                  disabled={!selectedProject || linkingProject}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {linkingProject ? 'Linking...' : 'Link Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
