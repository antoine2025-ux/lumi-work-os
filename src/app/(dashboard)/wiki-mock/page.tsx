"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Plus, 
  Sparkles,
  Home,
  BookOpen,
  FileText,
  Folder,
  Zap,
  ChevronLeft,
  ChevronRight,
  Upload,
  Users,
  Archive,
  Grid3X3,
  Share2,
  Bell,
  Circle,
  CheckCircle,
  ArrowRight,
  Layers,
  Compass,
  Lightbulb,
  Target,
  Brain,
  Edit3,
  MoreHorizontal,
  Clock,
  User,
  Tag,
  Eye,
  Heart,
  MessageSquare
} from "lucide-react"
import Link from "next/link"

export default function WikiMockPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-white transition-all duration-300 flex flex-col border-r border-gray-200 shadow-sm`}>
        {/* Top Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">L</span>
                </div>
                <div className="text-gray-900 text-sm">
                  <div className="font-semibold">Lumi Workspace</div>
                  <div className="text-gray-500 text-xs">Knowledge Hub</div>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
                <span className="text-white text-sm font-bold">L</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Explore knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* AI Assistant Button */}
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white mb-4">
                <Brain className="h-4 w-4 mr-2" />
                Ask Lumi AI
              </Button>
            </>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {!sidebarCollapsed && (
              <>
                {/* Dashboard */}
                <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Dashboard</span>
                </div>

                {/* Knowledge Base - Active */}
                <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg mb-6">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span className="text-indigo-700 font-medium">Knowledge Base</span>
                </div>

                {/* Workspaces Section */}
                <div className="mb-4">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">WORKSPACES</h3>
                  
                  {/* Personal Space */}
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-2">
                    <Circle className="h-2 w-2 text-emerald-500" />
                    <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                      <FileText className="h-2 w-2 text-emerald-600" />
                    </div>
                    <span className="text-sm">Personal Space</span>
                  </div>

                  {/* Team Workspace */}
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-2">
                    <Circle className="h-2 w-2 text-blue-500" />
                    <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                      <Layers className="h-2 w-2 text-blue-600" />
                    </div>
                    <span className="text-sm">Team Workspace</span>
                  </div>

                  {/* Create Workspace Button */}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Workspace
                  </Button>
                </div>

                {/* Recent Pages */}
                <div className="mb-4">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">RECENT PAGES</h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-sm">Project Overview</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-sm">API Documentation</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-sm">Team Guidelines</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Bottom Navigation */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-sm">AI Insights</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Team Members</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Import Data</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Grid3X3 className="h-4 w-4" />
                    <span className="text-sm">Templates</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">Shared Content</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Archive className="h-4 w-4" />
                    <span className="text-sm">Archive</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Knowledge Base</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-900">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Management Best Practices</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Sarah Johnson</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Updated 2 days ago</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>24 views</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 mb-6">
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">Project Management</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Best Practices</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Team Collaboration</span>
            </div>
          </div>

          {/* Page Content */}
          <div className="max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Effective project management is crucial for delivering successful outcomes in today's fast-paced business environment. 
                  This guide outlines proven strategies and best practices that can help teams achieve their goals efficiently and effectively.
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Principles</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-indigo-600 text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Clear Communication</h3>
                      <p className="text-gray-700">Establish transparent communication channels and regular check-ins to ensure everyone stays aligned.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-indigo-600 text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Define Clear Objectives</h3>
                      <p className="text-gray-700">Set specific, measurable, achievable, relevant, and time-bound (SMART) goals for your projects.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-indigo-600 text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Risk Management</h3>
                      <p className="text-gray-700">Identify potential risks early and develop contingency plans to mitigate their impact.</p>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Tools and Technologies</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Project Tracking</h3>
                    <p className="text-gray-700 text-sm">Use tools like Lumi's project management features to track progress and manage tasks effectively.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Collaboration</h3>
                    <p className="text-gray-700 text-sm">Leverage integrated communication tools to keep team members connected and informed.</p>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Conclusion</h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  By implementing these best practices and leveraging the right tools, teams can significantly improve their project management 
                  capabilities and deliver better results. Remember that successful project management is an ongoing process that requires 
                  continuous improvement and adaptation.
                </p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Comments</h3>
                <span className="text-sm text-gray-500">(3)</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">MJ</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">Mike Johnson</span>
                        <span className="text-xs text-gray-500">2 hours ago</span>
                      </div>
                      <p className="text-gray-700 text-sm">Great overview! The communication section really resonates with our current challenges.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">AL</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">Alex Lee</span>
                        <span className="text-xs text-gray-500">1 day ago</span>
                      </div>
                      <p className="text-gray-700 text-sm">Would love to see more details about risk management strategies. Any specific frameworks you recommend?</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">SJ</span>
                </div>
                <div className="flex-1">
                  <Input 
                    placeholder="Add a comment..." 
                    className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
