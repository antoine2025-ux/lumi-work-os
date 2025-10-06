"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeSelector } from "@/components/theme-selector"
import { MigrationModal } from "@/components/migrations/migration-modal"
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
  UserPlus,
  Crown,
  Plug,
  Download
} from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("workspace")

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

  const workspaceMembers = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@company.com",
      role: "Owner",
      avatar: null,
      lastActive: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@company.com",
      role: "Admin",
      avatar: null,
      lastActive: "2024-01-15T09:15:00Z"
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@company.com",
      role: "Member",
      avatar: null,
      lastActive: "2024-01-14T16:45:00Z"
    }
  ]

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Owner":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "Admin":
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Owner":
        return "bg-yellow-500"
      case "Admin":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
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
          onClick={() => setActiveTab("workspace")}
        >
          <Building className="mr-2 h-4 w-4" />
          Workspace
        </Button>
        <Button
          variant={activeTab === "members" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("members")}
        >
          <User className="mr-2 h-4 w-4" />
          Members
        </Button>
        <Button
          variant={activeTab === "notifications" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("notifications")}
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Button>
        <Button
          variant={activeTab === "appearance" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("appearance")}
        >
          <Palette className="mr-2 h-4 w-4" />
          Appearance
        </Button>
        <Button
          variant={activeTab === "integrations" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("integrations")}
        >
          <Plug className="mr-2 h-4 w-4" />
          Integrations
        </Button>
        <Button
          variant={activeTab === "permissions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("permissions")}
        >
          <Shield className="mr-2 h-4 w-4" />
          Permissions
        </Button>
        <Button
          variant={activeTab === "migrations" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("migrations")}
        >
          <Download className="mr-2 h-4 w-4" />
          Migrations
        </Button>
      </div>

      {/* Workspace Settings */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
              <CardDescription>
                Basic information about your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workspace Name</label>
                  <Input defaultValue="Acme Corporation" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workspace URL</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                      lumi.app/
                    </span>
                    <Input defaultValue="acme-corp" className="rounded-l-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input defaultValue="A modern company focused on innovation and growth" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry</label>
                <Input defaultValue="Technology" />
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

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
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members Settings */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-muted-foreground">
                Manage who has access to your workspace
              </p>
            </div>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>

          <div className="space-y-4">
            {workspaceMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{member.name}</h3>
                          {getRoleIcon(member.role)}
                          <Badge 
                            variant="secondary"
                            className={getRoleColor(member.role)}
                          >
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {new Date(member.lastActive).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      {member.role !== "Owner" && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="mr-2 h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
          <ThemeSelector />
        </div>
      )}

      {/* Integrations Settings */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="text-muted-foreground">
              Connect Lumi with your favorite tools and services
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Plug className="h-4 w-4 text-white" />
                  </div>
                  <span>Slack</span>
                </CardTitle>
                <CardDescription>Connect with Slack for notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="mb-4">Connected</Badge>
                <div className="space-y-2">
                  <p className="text-sm">• Send notifications to channels</p>
                  <p className="text-sm">• Sync user data</p>
                  <p className="text-sm">• Trigger workflows from messages</p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm">Configure</Button>
                  <Button variant="outline" size="sm">Disconnect</Button>
                </div>
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
                  description="Import your Slite workspace into Lumi Work OS"
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
                  description="Import your ClickUp workspace into Lumi Work OS"
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
    </div>
  )
}
