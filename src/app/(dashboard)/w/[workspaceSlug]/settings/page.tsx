"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MigrationModal } from "@/components/migrations/migration-modal"
import { WorkspaceMembers } from "@/components/settings/workspace-members"
import { useUserStatus } from '@/hooks/use-user-status'
import { 
  Settings, 
  User, 
  Building, 
  Shield, 
  Bell,
  Palette,
  Globe,
  Save,
  Edit,
  Trash2,
  Crown,
  Plug,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface WorkspaceData {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  createdAt: string
  updatedAt: string
  userRole: string
  stats: {
    members: number
    projects: number
    wikiPages: number
    tasks: number
  }
}

interface SlackIntegration {
  connected: boolean
  teamId?: string
  teamName?: string
  lastSyncAt?: string
}

export default function SettingsPage() {
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "workspace")
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null)
  
  // Update activeTab when searchParams change
  useEffect(() => {
    const tab = searchParams.get('tab') || "workspace"
    setActiveTab(tab)
  }, [searchParams])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: ""
  })
  const [slackIntegration, setSlackIntegration] = useState<SlackIntegration | null>(null)
  const [slackLoading, setSlackLoading] = useState(false)
  const [slackMessage, setSlackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch workspace data
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Wait for user status to be loaded
        if (userStatusLoading || !userStatus) {
          return
        }
        
        if (!userStatus.workspaceId) {
          throw new Error('No workspace found')
        }
        
        // Fetch workspace details
        const workspaceResponse = await fetch(`/api/workspaces/${userStatus.workspaceId}`)
        if (!workspaceResponse.ok) {
          throw new Error('Failed to fetch workspace data')
        }
        
        const workspace = await workspaceResponse.json()
        setWorkspaceData(workspace)
        setFormData({
          name: workspace.name,
          description: workspace.description || "",
          slug: workspace.slug
        })
      } catch (err) {
        console.error('Error fetching workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to load workspace data')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaceData()
  }, [userStatus, userStatusLoading])

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'slack_connected') {
      setSlackMessage({ type: 'success', text: 'Slack connected successfully!' })
      // Clear URL params
      router.replace('/settings?tab=integrations', { scroll: false })
      // Refresh Slack status
      fetchSlackIntegration()
    } else if (error) {
      setSlackMessage({ type: 'error', text: decodeURIComponent(error) })
      router.replace('/settings?tab=integrations', { scroll: false })
    }
  }, [searchParams, router])

  // Set active tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['workspace', 'notifications', 'appearance', 'integrations', 'permissions', 'migrations'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Fetch Slack integration status
  const fetchSlackIntegration = async () => {
    if (!userStatus?.workspaceId) return
    
    try {
      setSlackLoading(true)
      const response = await fetch('/api/integrations/slack')
      if (response.ok) {
        const data = await response.json()
        setSlackIntegration(data)
      } else {
        setSlackIntegration({ connected: false })
      }
    } catch (err) {
      console.error('Error fetching Slack integration:', err)
      setSlackIntegration({ connected: false })
    } finally {
      setSlackLoading(false)
    }
  }

  // Fetch Slack integration when integrations tab is active
  useEffect(() => {
    if (activeTab === 'integrations' && userStatus?.workspaceId) {
      fetchSlackIntegration()
    }
  }, [activeTab, userStatus?.workspaceId])

  // Handle Slack connect
  const handleSlackConnect = () => {
    window.location.href = '/api/integrations/slack/connect'
  }

  // Handle Slack disconnect
  const handleSlackDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack? This will stop all Slack notifications.')) {
      return
    }

    try {
      setSlackLoading(true)
      const response = await fetch('/api/integrations/slack', {
        method: 'DELETE'
      })

      if (response.ok) {
        setSlackMessage({ type: 'success', text: 'Slack disconnected successfully' })
        setSlackIntegration({ connected: false })
      } else {
        const data = await response.json()
        setSlackMessage({ type: 'error', text: data.error || 'Failed to disconnect Slack' })
      }
    } catch (err) {
      setSlackMessage({ type: 'error', text: 'Failed to disconnect Slack' })
    } finally {
      setSlackLoading(false)
    }
  }

  // Save workspace changes
  const handleSave = async () => {
    if (!workspaceData) return
    
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/workspaces/${workspaceData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update workspace')
      }
      
      const updatedWorkspace = await response.json()
      setWorkspaceData(updatedWorkspace)
      setEditMode(false)
      
      // Show success message (you could add a toast notification here)
      console.log('Workspace updated successfully')
      
    } catch (err) {
      console.error('Error updating workspace:', err)
      setError(err instanceof Error ? err.message : 'Failed to update workspace')
    } finally {
      setSaving(false)
    }
  }

  // Delete workspace
  const handleDeleteWorkspace = async () => {
    if (!workspaceData) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspaceData.name}"? This action cannot be undone and will permanently delete all workspace data including:\n\n` +
      `• ${workspaceData.stats.members} members\n` +
      `• ${workspaceData.stats.projects} projects\n` +
      `• ${workspaceData.stats.wikiPages} wiki pages\n` +
      `• ${workspaceData.stats.tasks} tasks\n\n` +
      `This will log you out and you'll need to create a new workspace.`
    )
    
    if (!confirmed) return
    
    const workspaceName = window.prompt(`Type "${workspaceData.name}" to confirm deletion:`)
    if (workspaceName !== workspaceData.name) {
      alert('Workspace name does not match. Deletion cancelled.')
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/workspaces/${workspaceData.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete workspace')
      }
      
      // Clear any cached data
      localStorage.removeItem('workspace-data')
      sessionStorage.clear()
      
      // Sign out the user to clear session
      await fetch('/api/auth/signout', { method: 'POST' })
      
      // Redirect to login page for a clean start
      window.location.href = '/login'
      
    } catch (err) {
      console.error('Error deleting workspace:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete workspace')
    } finally {
      setSaving(false)
    }
  }

  const handleMigration = async (platform: string, apiKey: string, workspaceId: string, additionalConfig?: any) => {
    const response = await fetch('/api/migrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        apiKey,
        workspaceId,
        additionalConfig
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Migration failed')
    }

    const result = await response.json()
    return result
  }


  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Settings className="h-8 w-8 text-primary" />
          <span>Settings</span>
        </h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "workspace" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("workspace")
            router.push('/settings?tab=workspace', { scroll: false })
          }}
        >
          <Building className="mr-2 h-4 w-4" />
          Workspace
        </Button>
        <Button
          variant={activeTab === "notifications" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("notifications")
            router.push('/settings?tab=notifications', { scroll: false })
          }}
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Button>
        <Button
          variant={activeTab === "appearance" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("appearance")
            router.push('/settings?tab=appearance', { scroll: false })
          }}
        >
          <Palette className="mr-2 h-4 w-4" />
          Appearance
        </Button>
        <Button
          variant={activeTab === "integrations" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("integrations")
            router.push('/settings?tab=integrations', { scroll: false })
          }}
        >
          <Plug className="mr-2 h-4 w-4" />
          Integrations
        </Button>
        <Button
          variant={activeTab === "permissions" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("permissions")
            router.push('/settings?tab=permissions', { scroll: false })
          }}
        >
          <Shield className="mr-2 h-4 w-4" />
          Permissions
        </Button>
        <Button
          variant={activeTab === "migrations" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("migrations")
            router.push('/settings?tab=migrations', { scroll: false })
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Migrations
        </Button>
        <Button
          variant={activeTab === "members" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("members")
            router.push('/settings?tab=members', { scroll: false })
          }}
        >
          <User className="mr-2 h-4 w-4" />
          Members
        </Button>
      </div>

      {/* Workspace Settings */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading workspace data...</span>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          ) : workspaceData ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Workspace Information</CardTitle>
                      <CardDescription>
                        Basic information about your workspace
                      </CardDescription>
                    </div>
                    {!editMode && (workspaceData.userRole === 'ADMIN' || workspaceData.userRole === 'OWNER') && (
                      <Button variant="outline" onClick={() => setEditMode(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="flex items-center space-x-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Workspace Name</label>
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!editMode}
                        placeholder="Enter workspace name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Workspace URL</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                          lumi.app/
                        </span>
                        <Input 
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          disabled={!editMode}
                          className="rounded-l-none"
                          placeholder="workspace-url"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      disabled={!editMode}
                      placeholder="Enter workspace description"
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Created</label>
                      <div className="text-sm text-muted-foreground">
                        {new Date(workspaceData.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Updated</label>
                      <div className="text-sm text-muted-foreground">
                        {new Date(workspaceData.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{workspaceData.stats.members}</div>
                      <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{workspaceData.stats.projects}</div>
                      <div className="text-sm text-muted-foreground">Projects</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{workspaceData.stats.wikiPages}</div>
                      <div className="text-sm text-muted-foreground">Wiki Pages</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{workspaceData.stats.tasks}</div>
                      <div className="text-sm text-muted-foreground">Tasks</div>
                    </div>
                  </div>
                  
                  {editMode && (
                    <div className="flex space-x-2">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditMode(false)
                          setFormData({
                            name: workspaceData.name,
                            description: workspaceData.description || "",
                            slug: workspaceData.slug
                          })
                          setError(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {workspaceData.userRole === 'OWNER' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                      <div>
                        <h4 className="font-medium text-destructive">Delete Workspace</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete this workspace and all its data
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteWorkspace}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  No workspace data available
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose what email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">New Wiki Pages</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new wiki pages are created
                  </p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Onboarding Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive updates on onboarding progress
                  </p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Workflow Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified about workflow status changes
                  </p>
                </div>
                <Button variant="outline" size="sm">Enabled</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appearance Settings */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Theme preferences for your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    The application uses dark mode by default
                  </p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations Settings */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="text-muted-foreground">
              Connect Loopwell with your favorite tools and services
            </p>
          </div>

          {/* Success/Error Messages */}
          {slackMessage && (
            <div className={`p-4 rounded-lg border flex items-center gap-3 ${
              slackMessage.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              {slackMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <p className={`text-sm ${
                slackMessage.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {slackMessage.text}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSlackMessage(null)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#4A154B] rounded-lg flex items-center justify-center">
                    <Plug className="h-4 w-4 text-white" />
                  </div>
                  <span>Slack</span>
                </CardTitle>
                <CardDescription>Connect with Slack for notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {slackLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {slackIntegration?.connected ? (
                      <>
                        <Badge variant="secondary" className="mb-4">Connected</Badge>
                        {slackIntegration.teamName && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Workspace: {slackIntegration.teamName}
                          </p>
                        )}
                        <div className="space-y-2 mb-4">
                          <p className="text-sm">• Send notifications to channels</p>
                          <p className="text-sm">• Loopbrain can send messages</p>
                          <p className="text-sm">• Automatic token refresh</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleSlackDisconnect}
                            disabled={slackLoading}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="mb-4">Not Connected</Badge>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm">• Send notifications to channels</p>
                          <p className="text-sm">• Loopbrain can send messages</p>
                          <p className="text-sm">• Automatic token refresh</p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={handleSlackConnect}
                          disabled={slackLoading}
                          className="w-full"
                        >
                          {slackLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect Slack'
                          )}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <span>Google Drive</span>
                </CardTitle>
                <CardDescription>Sync documents and files</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mb-4">Available</Badge>
                <div className="space-y-2">
                  <p className="text-sm">• Sync documents to wiki</p>
                  <p className="text-sm">• Auto-import new files</p>
                  <p className="text-sm">• Version control integration</p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <span>Microsoft Teams</span>
                </CardTitle>
                <CardDescription>Team notifications and collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mb-4">Available</Badge>
                <div className="space-y-2">
                  <p className="text-sm">• Team notifications</p>
                  <p className="text-sm">• Meeting integration</p>
                  <p className="text-sm">• File sharing</p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Permissions Settings */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Permissions</h2>
            <p className="text-muted-foreground">
              Manage access control and security settings
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Configure roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div>
                      <h4 className="font-medium">Owner</h4>
                      <p className="text-sm text-muted-foreground">Full access to all features</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500">1 member</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Admin</h4>
                      <p className="text-sm text-muted-foreground">Manage workspace and users</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500">2 members</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <h4 className="font-medium">Member</h4>
                      <p className="text-sm text-muted-foreground">Standard workspace access</p>
                    </div>
                  </div>
                  <Badge className="bg-gray-500">5 members</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page Permissions</CardTitle>
              <CardDescription>
                Control who can view and edit specific pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Public pages</span>
                  <Badge variant="outline">12 pages</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Team-only pages</span>
                  <Badge variant="outline">8 pages</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Private pages</span>
                  <Badge variant="outline">3 pages</Badge>
                </div>
              </div>
              <Button variant="outline" className="mt-4">
                <Shield className="mr-2 h-4 w-4" />
                Manage Page Permissions
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Migrations Settings */}
      {activeTab === "migrations" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Platform Migrations</h2>
            <p className="text-muted-foreground">
              Seamlessly migrate your documentation from other platforms
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <span>Slite Migration</span>
                </CardTitle>
                <CardDescription>Import your Slite workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">• All documents and folders</p>
                  <p className="text-sm">• Comments and version history</p>
                  <p className="text-sm">• Attachments and media</p>
                  <p className="text-sm">• Team structure and permissions</p>
                </div>
                <MigrationModal
                  platform="Slite"
                  platformIcon={
                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Download className="h-3 w-3 text-white" />
                    </div>
                  }
                  description="Import your Slite workspace into Loopwell Work OS"
                  features={[
                    "All documents and folders",
                    "Comments and version history", 
                    "Attachments and media",
                    "Team structure and permissions"
                  ]}
                  onStartMigration={(apiKey, workspaceId) => 
                    handleMigration("slite", apiKey, workspaceId)
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <span>ClickUp Migration</span>
                </CardTitle>
                <CardDescription>Import ClickUp tasks and projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">• Tasks and subtasks</p>
                  <p className="text-sm">• Project documentation</p>
                  <p className="text-sm">• Custom fields and tags</p>
                  <p className="text-sm">• Team assignments</p>
                </div>
                <MigrationModal
                  platform="ClickUp"
                  platformIcon={
                    <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Download className="h-3 w-3 text-white" />
                    </div>
                  }
                  description="Import your ClickUp workspace into Loopwell Work OS"
                  features={[
                    "Tasks and subtasks",
                    "Project documentation",
                    "Custom fields and tags", 
                    "Team assignments"
                  ]}
                  onStartMigration={(apiKey, workspaceId, additionalConfig) => 
                    handleMigration("clickup", apiKey, workspaceId, additionalConfig)
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <span>Notion Migration</span>
                </CardTitle>
                <CardDescription>Transfer your Notion workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">• Pages and databases</p>
                  <p className="text-sm">• Blocks and content</p>
                  <p className="text-sm">• Relations and properties</p>
                  <p className="text-sm">• Team permissions</p>
                </div>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Start Migration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <span>Confluence Migration</span>
                </CardTitle>
                <CardDescription>Migrate from Atlassian Confluence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">• Spaces and pages</p>
                  <p className="text-sm">• Attachments and macros</p>
                  <p className="text-sm">• Comments and labels</p>
                  <p className="text-sm">• User permissions</p>
                </div>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Start Migration
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Migration History</CardTitle>
              <CardDescription>
                View your past migrations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Slite Migration</p>
                      <p className="text-sm text-muted-foreground">Completed 2 hours ago</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">24 items imported</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">ClickUp Migration</p>
                      <p className="text-sm text-muted-foreground">In progress</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500">Processing...</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members & Invites */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <WorkspaceMembers />
        </div>
      )}
    </div>
  )
}
