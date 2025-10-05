"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  Slack, 
  HardDrive, 
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from "lucide-react"

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([
    {
      id: "slack",
      name: "Slack",
      description: "Connect with Slack to receive notifications and trigger workflows",
      icon: Slack,
      status: "connected",
      lastSync: "2024-01-15T10:30:00Z",
      features: [
        "Send notifications to channels",
        "Trigger workflows from messages",
        "Sync user data",
        "Create automated responses"
      ]
    },
    {
      id: "google-drive",
      name: "Google Drive",
      description: "Integrate with Google Drive to sync documents and files",
      icon: HardDrive,
      status: "disconnected",
      lastSync: null,
      features: [
        "Sync documents to wiki",
        "Auto-import new files",
        "Version control integration",
        "Collaborative editing"
      ]
    },
    {
      id: "microsoft-teams",
      name: "Microsoft Teams",
      description: "Connect with Microsoft Teams for notifications and collaboration",
      icon: Settings,
      status: "available",
      lastSync: null,
      features: [
        "Team notifications",
        "Meeting integration",
        "File sharing",
        "Calendar sync"
      ]
    },
    {
      id: "zoom",
      name: "Zoom",
      description: "Integrate with Zoom for meeting management and recordings",
      icon: Settings,
      status: "available",
      lastSync: null,
      features: [
        "Meeting scheduling",
        "Recording management",
        "Attendance tracking",
        "Meeting notes sync"
      ]
    }
  ])

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { 
              ...integration, 
              status: integration.status === "connected" ? "disconnected" : "connected",
              lastSync: integration.status === "connected" ? null : new Date().toISOString()
            }
          : integration
      )
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "disconnected":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "available":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "disconnected":
        return "bg-red-500"
      case "available":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return "Never"
    const date = new Date(lastSync)
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Zap className="h-8 w-8 text-primary" />
          <span>Integrations</span>
        </h1>
        <p className="text-muted-foreground">
          Connect Lumi with your favorite tools and services
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === "connected").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === "available").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to connect
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-muted-foreground">
              Slack integration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <integration.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      {getStatusIcon(integration.status)}
                      <Badge 
                        variant={integration.status === "connected" ? "default" : "secondary"}
                        className={getStatusColor(integration.status)}
                      >
                        {integration.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {integration.description}
                    </CardDescription>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last synced: {formatLastSync(integration.lastSync)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {integration.status === "connected" && (
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                  )}
                  <Button 
                    variant={integration.status === "connected" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleIntegration(integration.id)}
                  >
                    {integration.status === "connected" ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Features</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {integration.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="text-center py-12">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">More Integrations Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            We're working on adding more integrations to help you connect all your tools
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Notion", "Confluence", "Jira", "Asana", "Trello", "Monday.com"].map((tool) => (
              <Badge key={tool} variant="outline" className="px-3 py-1">
                {tool}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
