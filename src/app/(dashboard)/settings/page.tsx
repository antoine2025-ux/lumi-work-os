"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Crown
} from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("workspace")

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
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose your preferred theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="h-20 bg-background border rounded-lg flex items-center justify-center">
                    <Globe className="h-8 w-8" />
                  </div>
                  <h4 className="font-medium text-center">System</h4>
                  <p className="text-sm text-muted-foreground text-center">
                    Follow system preference
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 bg-white border rounded-lg flex items-center justify-center">
                    <Globe className="h-8 w-8" />
                  </div>
                  <h4 className="font-medium text-center">Light</h4>
                  <p className="text-sm text-muted-foreground text-center">
                    Light theme
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 bg-gray-900 border rounded-lg flex items-center justify-center">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-medium text-center">Dark</h4>
                  <p className="text-sm text-muted-foreground text-center">
                    Dark theme
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
