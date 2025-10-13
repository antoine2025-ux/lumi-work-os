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
  Brain
} from "lucide-react"
import Link from "next/link"

export default function WikiDemoPage() {
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
                {/* Dashboard - Active */}
                <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg mb-2">
                  <Home className="h-4 w-4 text-indigo-600" />
                  <span className="text-indigo-700 font-medium">Dashboard</span>
                </div>

                {/* Knowledge Base */}
                <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-6">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Knowledge Base</span>
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
              <Home className="h-4 w-4 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Lumi</h2>
            <p className="text-gray-600 mb-6">Your intelligent workspace for knowledge management and team collaboration</p>

            {/* Quick Start Guide */}
            <div className="space-y-3">
              {/* Setup Complete */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-gray-700">Workspace configured</span>
              </div>

              {/* Organization Complete */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-gray-700">Knowledge structure created</span>
              </div>

              {/* Import Data */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Import your documents</span>
              </div>

              {/* AI Assistant - Featured */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-sm">
                <Brain className="h-5 w-5 text-indigo-600" />
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">Activate Lumi AI Assistant</span>
                  <p className="text-gray-600 text-sm mt-1">Get intelligent insights and answers from your knowledge base.</p>
                </div>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                  Enable AI
                </Button>
              </div>

              {/* Team Collaboration */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Invite team members</span>
              </div>

              {/* Notifications */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <Bell className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Configure notifications</span>
              </div>
            </div>
          </div>

          {/* Feature Showcase */}
          <div className="flex justify-end">
            <div className="w-96 h-80 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center border border-indigo-200 shadow-sm">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-indigo-200 rounded-lg mx-auto"></div>
                  <div className="w-6 h-6 bg-purple-200 rounded-lg mx-auto"></div>
                  <div className="w-10 h-10 bg-indigo-200 rounded-lg mx-auto"></div>
                </div>
                <div className="w-20 h-4 bg-gray-300 rounded-lg mx-auto mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}