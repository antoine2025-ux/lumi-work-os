"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Users, 
  Settings, 
  Plus,
  Crown,
  UserCheck,
  UserX,
  Edit,
  Trash2
} from "lucide-react"

export default function PermissionsPage() {
  const permissions = [
    {
      id: "1",
      name: "Wiki Management",
      description: "Create, edit, and manage wiki pages",
      level: "Admin",
      users: 3
    },
    {
      id: "2", 
      name: "User Management",
      description: "Invite and manage team members",
      level: "Owner",
      users: 1
    },
    {
      id: "3",
      name: "Onboarding Plans",
      description: "Create and manage onboarding templates",
      level: "Admin",
      users: 2
    },
    {
      id: "4",
      name: "Integrations",
      description: "Configure and manage integrations",
      level: "Admin", 
      users: 2
    }
  ]

  const teamMembers = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@company.com",
      role: "Owner",
      permissions: ["All"],
      lastActive: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      name: "Jane Smith", 
      email: "jane.smith@company.com",
      role: "Admin",
      permissions: ["Wiki Management", "Onboarding Plans", "Integrations"],
      lastActive: "2024-01-15T09:15:00Z"
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@company.com", 
      role: "Member",
      permissions: ["View Only"],
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
        return <UserCheck className="h-4 w-4 text-gray-500" />
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
          <Shield className="h-8 w-8 text-primary" />
          <span>Permissions</span>
        </h1>
        <p className="text-muted-foreground">
          Manage user roles and permissions for your workspace
        </p>
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Team Members</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>

        <div className="space-y-4">
          {teamMembers.map((member) => (
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
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">Permissions:</span>
                        <div className="flex flex-wrap gap-1">
                          {member.permissions.map((permission, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    {member.role !== "Owner" && (
                      <Button variant="outline" size="sm">
                        <UserX className="mr-2 h-3 w-3" />
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

      {/* Permission Groups */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Permission Groups</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {permissions.map((permission) => (
            <Card key={permission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>{permission.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {permission.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {permission.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{permission.users} users</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-3 w-3" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
