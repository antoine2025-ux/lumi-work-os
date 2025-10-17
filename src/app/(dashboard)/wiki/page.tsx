"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Plus, 
  Search, 
  Sparkles,
  Clock,
  User,
  Tag,
  FileText,
  Folder,
  Star,
  Loader2,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  Share2,
  Users,
  MessageSquare,
  ArrowRight,
  Circle,
  Lightbulb,
  Brain,
  Archive,
  Grid3X3,
  Upload,
  Bell
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { WikiLayout } from "@/components/wiki/wiki-layout"

export default function WikiPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceData, setWorkspaceData] = useState<any>(null)

  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        setIsLoading(true)
        // Load workspace data
        const response = await fetch('/api/wiki/workspaces')
        if (response.ok) {
          const data = await response.json()
          setWorkspaceData(data)
        }
      } catch (error) {
        console.error('Error loading workspace data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspaceData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <WikiLayout>
      <div className="flex-1 p-8">
        {/* Team Workspace Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Workspace</h1>
              <p className="text-gray-600">Collaborative workspace for your team's knowledge and documentation</p>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="h-4 w-4 text-yellow-600" />
                  </div>
                  <CardTitle className="text-xl">Welcome to Team Workspace</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700 mb-4">
                  This is your team's shared space for collaboration on documents, knowledge sharing, and project work. 
                  Perfect for documentation, meeting notes, and knowledge management.
                </CardDescription>
                <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700">
                  Team Collaboration <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Create Team Page</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Start a new collaborative document that your team can view and edit together.
                </CardDescription>
                <Button className="w-full" onClick={() => router.push('/wiki/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team Page
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Team Features</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Explore collaboration tools, comments, and team management features.
                </CardDescription>
                <Button variant="outline" className="w-full">
                  Learn More <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* What you can do section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">What you can do in Team Workspace:</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Users className="h-5 w-5 text-blue-600" />,
                title: "Collaborative Editing",
                description: "Work together on documents in real-time"
              },
              {
                icon: <Circle className="h-5 w-5 text-blue-600" />,
                title: "Permission Control",
                description: "Manage who can view and edit content"
              },
              {
                icon: <Bell className="h-5 w-5 text-blue-600" />,
                title: "Team Notifications",
                description: "Stay updated on team activities and changes"
              },
              {
                icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
                title: "Team Comments",
                description: "Discuss and provide feedback on content"
              },
              {
                icon: <Clock className="h-5 w-5 text-blue-600" />,
                title: "Version History",
                description: "Track changes and revert to previous versions"
              },
              {
                icon: <FileText className="h-5 w-5 text-blue-600" />,
                title: "Shared Templates",
                description: "Use team-approved templates for consistency"
              }
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WikiLayout>
  )
}