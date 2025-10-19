"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  Server, 
  Globe, 
  Users, 
  MessageSquare, 
  FileText, 
  Kanban, 
  Bot,
  Zap,
  Shield,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Info
} from 'lucide-react'

interface SystemNode {
  id: string
  name: string
  type: 'external' | 'client' | 'frontend' | 'api' | 'service' | 'module' | 'data'
  description: string
  dependencies: string[]
  connections: string[]
  position: { x: number; y: number }
  color: string
  icon: React.ReactNode
}

const systemNodes: SystemNode[] = [
  // External Services
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    type: 'external',
    description: 'AI language model for chat, content generation, and analysis',
    dependencies: [],
    connections: ['ai-service'],
    position: { x: 50, y: 50 },
    color: 'bg-blue-100 border-blue-300',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    type: 'external',
    description: 'User authentication and authorization',
    dependencies: [],
    connections: ['auth-service'],
    position: { x: 200, y: 50 },
    color: 'bg-red-100 border-red-300',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    type: 'external',
    description: 'Primary database for all application data',
    dependencies: [],
    connections: ['database-service'],
    position: { x: 350, y: 50 },
    color: 'bg-green-100 border-green-300',
    icon: <Database className="w-5 h-5" />
  },
  {
    id: 'redis',
    name: 'Redis Cache',
    type: 'external',
    description: 'In-memory cache for performance optimization',
    dependencies: [],
    connections: ['cache-service'],
    position: { x: 500, y: 50 },
    color: 'bg-orange-100 border-orange-300',
    icon: <Zap className="w-5 h-5" />
  },

  // Client Layer
  {
    id: 'web-app',
    name: 'Next.js Web App',
    type: 'client',
    description: 'Main application frontend built with Next.js 15',
    dependencies: ['auth-service', 'realtime-service'],
    connections: ['dashboard', 'wiki', 'projects', 'tasks', 'ai', 'onboarding', 'org-chart', 'realtime'],
    position: { x: 275, y: 150 },
    color: 'bg-purple-100 border-purple-300',
    icon: <Globe className="w-5 h-5" />
  },

  // Frontend Components
  {
    id: 'dashboard',
    name: 'Dashboard',
    type: 'frontend',
    description: 'Main dashboard with quick actions and overview',
    dependencies: ['auth-api'],
    connections: ['auth-api'],
    position: { x: 50, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'wiki',
    name: 'Wiki System',
    type: 'frontend',
    description: 'Knowledge management with rich text editing',
    dependencies: ['wiki-api'],
    connections: ['wiki-api'],
    position: { x: 150, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'projects',
    name: 'Project Management',
    type: 'frontend',
    description: 'Project and task management with Kanban boards',
    dependencies: ['project-api'],
    connections: ['project-api'],
    position: { x: 250, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'tasks',
    name: 'Task Management',
    type: 'frontend',
    description: 'Individual task management and tracking',
    dependencies: ['task-api'],
    connections: ['task-api'],
    position: { x: 350, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'ai',
    name: 'AI Assistant',
    type: 'frontend',
    description: 'AI-powered chat and content generation',
    dependencies: ['ai-api'],
    connections: ['ai-api'],
    position: { x: 450, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'onboarding',
    name: 'Onboarding System',
    type: 'frontend',
    description: 'Employee onboarding and progress tracking',
    dependencies: ['onboarding-api'],
    connections: ['onboarding-api'],
    position: { x: 550, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'org-chart',
    name: 'Org Chart',
    type: 'frontend',
    description: 'Interactive organization structure',
    dependencies: ['org-api'],
    connections: ['org-api'],
    position: { x: 650, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'realtime',
    name: 'Real-time Collaboration',
    type: 'frontend',
    description: 'Live editing and real-time updates',
    dependencies: ['auth-api', 'realtime-service'],
    connections: ['auth-api', 'realtime-service'],
    position: { x: 750, y: 250 },
    color: 'bg-indigo-100 border-indigo-300',
    icon: <Zap className="w-5 h-5" />
  },

  // API Layer
  {
    id: 'auth-api',
    name: 'Authentication API',
    type: 'api',
    description: 'Handles user authentication and authorization',
    dependencies: ['auth-service'],
    connections: ['auth-service'],
    position: { x: 100, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'wiki-api',
    name: 'Wiki API',
    type: 'api',
    description: 'Manages wiki content and operations',
    dependencies: ['database-service'],
    connections: ['database-service'],
    position: { x: 200, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'project-api',
    name: 'Project API',
    type: 'api',
    description: 'Handles project and task operations',
    dependencies: ['database-service'],
    connections: ['database-service'],
    position: { x: 300, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'task-api',
    name: 'Task API',
    type: 'api',
    description: 'Manages individual task operations',
    dependencies: ['database-service'],
    connections: ['database-service'],
    position: { x: 400, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'ai-api',
    name: 'AI Assistant API',
    type: 'api',
    description: 'Handles AI chat and content generation',
    dependencies: ['ai-service'],
    connections: ['ai-service'],
    position: { x: 500, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'onboarding-api',
    name: 'Onboarding API',
    type: 'api',
    description: 'Manages onboarding templates and progress',
    dependencies: ['database-service'],
    connections: ['database-service'],
    position: { x: 600, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'org-api',
    name: 'Organization API',
    type: 'api',
    description: 'Handles user and workspace management',
    dependencies: ['database-service'],
    connections: ['database-service'],
    position: { x: 700, y: 350 },
    color: 'bg-yellow-100 border-yellow-300',
    icon: <Users className="w-5 h-5" />
  },

  // Core Services
  {
    id: 'auth-service',
    name: 'Authentication Service',
    type: 'service',
    description: 'NextAuth.js service for user authentication',
    dependencies: ['google-oauth', 'database-service'],
    connections: ['google-oauth', 'database-service'],
    position: { x: 100, y: 450 },
    color: 'bg-pink-100 border-pink-300',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 'database-service',
    name: 'Database Service',
    type: 'service',
    description: 'Prisma ORM for database operations',
    dependencies: ['postgresql', 'cache-service'],
    connections: ['postgresql', 'cache-service', 'wiki-module', 'project-module', 'onboarding-module', 'org-module'],
    position: { x: 300, y: 450 },
    color: 'bg-pink-100 border-pink-300',
    icon: <Database className="w-5 h-5" />
  },
  {
    id: 'realtime-service',
    name: 'Real-time Service',
    type: 'service',
    description: 'Socket.IO for live collaboration',
    dependencies: ['database-service'],
    connections: ['database-service', 'web-app'],
    position: { x: 500, y: 450 },
    color: 'bg-pink-100 border-pink-300',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'ai-service',
    name: 'AI Service',
    type: 'service',
    description: 'OpenAI integration for AI capabilities',
    dependencies: ['openai', 'database-service'],
    connections: ['openai', 'database-service', 'ai-module'],
    position: { x: 700, y: 450 },
    color: 'bg-pink-100 border-pink-300',
    icon: <Bot className="w-5 h-5" />
  },
  {
    id: 'cache-service',
    name: 'Cache Service',
    type: 'service',
    description: 'Redis caching for performance',
    dependencies: ['redis'],
    connections: ['redis', 'database-service'],
    position: { x: 900, y: 450 },
    color: 'bg-pink-100 border-pink-300',
    icon: <Zap className="w-5 h-5" />
  },

  // Business Logic Modules
  {
    id: 'wiki-module',
    name: 'Wiki Module',
    type: 'module',
    description: 'Content management, version control, permissions',
    dependencies: ['database-service'],
    connections: ['database-service', 'wiki-data'],
    position: { x: 200, y: 550 },
    color: 'bg-green-100 border-green-300',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'project-module',
    name: 'Project Module',
    type: 'module',
    description: 'Project management, task dependencies, Kanban boards',
    dependencies: ['database-service'],
    connections: ['database-service', 'project-data'],
    position: { x: 400, y: 550 },
    color: 'bg-green-100 border-green-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'onboarding-module',
    name: 'Onboarding Module',
    type: 'module',
    description: 'Templates, progress tracking, 30/60/90 day plans',
    dependencies: ['database-service'],
    connections: ['database-service', 'onboarding-data'],
    position: { x: 600, y: 550 },
    color: 'bg-green-100 border-green-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'org-module',
    name: 'Organization Module',
    type: 'module',
    description: 'User management, RBAC, workspace isolation',
    dependencies: ['database-service'],
    connections: ['database-service', 'user-data', 'workspace-data'],
    position: { x: 800, y: 550 },
    color: 'bg-green-100 border-green-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'ai-module',
    name: 'AI Module',
    type: 'module',
    description: 'Document generation, content analysis, RAG search',
    dependencies: ['ai-service'],
    connections: ['ai-service', 'chat-data'],
    position: { x: 1000, y: 550 },
    color: 'bg-green-100 border-green-300',
    icon: <Bot className="w-5 h-5" />
  },

  // Data Layer
  {
    id: 'user-data',
    name: 'User Data',
    type: 'data',
    description: 'User profiles, authentication data',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 200, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'workspace-data',
    name: 'Workspace Data',
    type: 'data',
    description: 'Workspace configurations and settings',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 400, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <Globe className="w-5 h-5" />
  },
  {
    id: 'wiki-data',
    name: 'Wiki Data',
    type: 'data',
    description: 'Wiki pages, content, and metadata',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 600, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'project-data',
    name: 'Project Data',
    type: 'data',
    description: 'Projects, tasks, and related data',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 800, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <Kanban className="w-5 h-5" />
  },
  {
    id: 'onboarding-data',
    name: 'Onboarding Data',
    type: 'data',
    description: 'Onboarding plans and progress',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 1000, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'chat-data',
    name: 'Chat Data',
    type: 'data',
    description: 'AI chat sessions and messages',
    dependencies: ['postgresql'],
    connections: ['postgresql'],
    position: { x: 1200, y: 650 },
    color: 'bg-teal-100 border-teal-300',
    icon: <MessageSquare className="w-5 h-5" />
  }
]

const systemInteractions = [
  {
    id: 'auth-flow',
    title: 'Authentication Flow',
    description: 'Complete user authentication process',
    flow: [
      { step: 1, component: 'User', action: 'Initiates login' },
      { step: 2, component: 'Browser', action: 'Sends request to Web App' },
      { step: 3, component: 'Web App', action: 'Redirects to Auth API' },
      { step: 4, component: 'Auth API', action: 'Validates credentials' },
      { step: 5, component: 'Auth Service', action: 'Processes with NextAuth.js' },
      { step: 6, component: 'Google OAuth', action: 'Handles OAuth flow' },
      { step: 7, component: 'Database Service', action: 'Stores/retrieves user data' },
      { step: 8, component: 'PostgreSQL', action: 'Persists user session' }
    ],
    dependencies: ['NextAuth.js', 'Google OAuth', 'Prisma ORM', 'PostgreSQL']
  },
  {
    id: 'wiki-flow',
    title: 'Wiki Content Flow',
    description: 'How wiki content is created, edited, and managed',
    flow: [
      { step: 1, component: 'User', action: 'Creates/edits wiki page' },
      { step: 2, component: 'Wiki Component', action: 'Captures user input' },
      { step: 3, component: 'Wiki API', action: 'Validates and processes request' },
      { step: 4, component: 'Database Service', action: 'Handles data operations' },
      { step: 5, component: 'Wiki Module', action: 'Applies business logic' },
      { step: 6, component: 'Wiki Data', action: 'Stores content and metadata' },
      { step: 7, component: 'PostgreSQL', action: 'Persists data' },
      { step: 8, component: 'Real-time Service', action: 'Notifies other users' }
    ],
    dependencies: ['Prisma ORM', 'PostgreSQL', 'Socket.IO', 'Rich Text Editor']
  },
  {
    id: 'ai-flow',
    title: 'AI Assistant Flow',
    description: 'How AI chat and content generation works',
    flow: [
      { step: 1, component: 'User', action: 'Sends message to AI' },
      { step: 2, component: 'AI Component', action: 'Captures user input' },
      { step: 3, component: 'AI API', action: 'Processes chat request' },
      { step: 4, component: 'AI Service', action: 'Manages OpenAI integration' },
      { step: 5, component: 'OpenAI GPT-4', action: 'Generates AI response' },
      { step: 6, component: 'Database Service', action: 'Stores chat history' },
      { step: 7, component: 'Chat Data', action: 'Persists conversation' },
      { step: 8, component: 'PostgreSQL', action: 'Saves to database' }
    ],
    dependencies: ['OpenAI API', 'Prisma ORM', 'PostgreSQL', 'Streaming Response']
  },
  {
    id: 'realtime-flow',
    title: 'Real-time Collaboration Flow',
    description: 'How live editing and real-time updates work',
    flow: [
      { step: 1, component: 'User A', action: 'Makes changes to document' },
      { step: 2, component: 'Web App', action: 'Captures changes' },
      { step: 3, component: 'Real-time Service', action: 'Processes via Socket.IO' },
      { step: 4, component: 'Database Service', action: 'Updates database' },
      { step: 5, component: 'PostgreSQL', action: 'Persists changes' },
      { step: 6, component: 'Real-time Service', action: 'Broadcasts to other users' },
      { step: 7, component: 'User B', action: 'Receives live updates' },
      { step: 8, component: 'Web App', action: 'Updates UI in real-time' }
    ],
    dependencies: ['Socket.IO', 'WebSockets', 'Prisma ORM', 'PostgreSQL']
  },
  {
    id: 'project-flow',
    title: 'Project Management Flow',
    description: 'How projects and tasks are managed',
    flow: [
      { step: 1, component: 'User', action: 'Creates/updates project/task' },
      { step: 2, component: 'Project Component', action: 'Handles user interaction' },
      { step: 3, component: 'Project API', action: 'Validates request' },
      { step: 4, component: 'Database Service', action: 'Processes data operations' },
      { step: 5, component: 'Project Module', action: 'Applies business rules' },
      { step: 6, component: 'Project Data', action: 'Stores project information' },
      { step: 7, component: 'PostgreSQL', action: 'Persists data' },
      { step: 8, component: 'Real-time Service', action: 'Notifies team members' }
    ],
    dependencies: ['Prisma ORM', 'PostgreSQL', 'Socket.IO', 'Kanban Board']
  }
]

export default function ArchitectureDiagramPage() {
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<string | null>(null)

  const getNodeTypeColor = (type: string) => {
    const colors = {
      external: 'bg-blue-100 border-blue-300 text-blue-800',
      client: 'bg-purple-100 border-purple-300 text-purple-800',
      frontend: 'bg-indigo-100 border-indigo-300 text-indigo-800',
      api: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      service: 'bg-pink-100 border-pink-300 text-pink-800',
      module: 'bg-green-100 border-green-300 text-green-800',
      data: 'bg-teal-100 border-teal-300 text-teal-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 border-gray-300 text-gray-800'
  }

  const getNodeTypeLabel = (type: string) => {
    const labels = {
      external: 'External Service',
      client: 'Client Layer',
      frontend: 'Frontend Component',
      api: 'API Endpoint',
      service: 'Core Service',
      module: 'Business Module',
      data: 'Data Layer'
    }
    return labels[type as keyof typeof labels] || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Interactive System Architecture Diagram
          </h1>
          <p className="text-lg text-gray-600">
            Click on any component to see detailed information about its role and connections
          </p>
        </div>

        <Tabs defaultValue="diagram" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagram">Interactive Diagram</TabsTrigger>
            <TabsTrigger value="interactions">System Interactions</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Architecture Diagram</CardTitle>
                <CardDescription>
                  Click on any component to see detailed information about its role and connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-white border-2 border-gray-200 rounded-lg p-8 min-h-[800px] overflow-auto">
                  {/* Diagram Container */}
                  <div className="relative w-full h-full">
                    {systemNodes.map((node) => (
                      <div
                        key={node.id}
                        className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${getNodeTypeColor(node.type)} border-2 rounded-lg p-3 min-w-[120px] text-center`}
                        style={{
                          left: `${node.position.x}px`,
                          top: `${node.position.y}px`,
                        }}
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {node.icon}
                        </div>
                        <div className="text-sm font-medium">{node.name}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {getNodeTypeLabel(node.type)}
                        </Badge>
                      </div>
                    ))}

                    {/* Connection Lines */}
                    {systemNodes.map((node) =>
                      node.connections.map((connectionId) => {
                        const targetNode = systemNodes.find(n => n.id === connectionId)
                        if (!targetNode) return null

                        const startX = node.position.x + 60
                        const startY = node.position.y + 40
                        const endX = targetNode.position.x + 60
                        const endY = targetNode.position.y + 40

                        return (
                          <svg
                            key={`${node.id}-${connectionId}`}
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 1 }}
                          >
                            <line
                              x1={startX}
                              y1={startY}
                              x2={endX}
                              y2={endY}
                              stroke="#6b7280"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                              markerEnd="url(#arrowhead)"
                            />
                          </svg>
                        )
                      })
                    )}

                    {/* Arrow marker definition */}
                    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#6b7280"
                          />
                        </marker>
                      </defs>
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Node Details */}
            {selectedNode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedNode.icon}
                    {selectedNode.name}
                  </CardTitle>
                  <CardDescription>
                    {getNodeTypeLabel(selectedNode.type)}
                  </CardDescription>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {getNodeTypeLabel(selectedNode.type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedNode.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Dependencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.dependencies.length > 0 ? (
                        selectedNode.dependencies.map((dep) => (
                          <Badge key={dep} variant="outline">
                            {dep}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No dependencies</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Connections</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.connections.map((conn) => (
                        <Badge key={conn} variant="outline">
                          {conn}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-6">
            <div className="grid gap-6">
              {systemInteractions.map((interaction) => (
                <Card key={interaction.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      {interaction.title}
                    </CardTitle>
                    <CardDescription>{interaction.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-3">Flow Steps</h4>
                        <div className="space-y-2">
                          {interaction.flow.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{step.component}</div>
                                <div className="text-sm text-gray-600">{step.action}</div>
                              </div>
                              {index < interaction.flow.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Key Dependencies</h4>
                        <div className="flex flex-wrap gap-2">
                          {interaction.dependencies.map((dep) => (
                            <Badge key={dep} variant="secondary">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>External Dependencies</CardTitle>
                  <CardDescription>Third-party services and libraries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">OpenAI GPT-4</span>
                    </div>
                    <Badge variant="secondary">AI Service</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Google OAuth</span>
                    </div>
                    <Badge variant="secondary">Authentication</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-green-600" />
                      <span className="font-medium">PostgreSQL</span>
                    </div>
                    <Badge variant="secondary">Database</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Redis</span>
                    </div>
                    <Badge variant="secondary">Cache</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Internal Dependencies</CardTitle>
                  <CardDescription>Core services and modules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Next.js 15</span>
                    </div>
                    <Badge variant="secondary">Framework</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-pink-600" />
                      <span className="font-medium">Prisma ORM</span>
                    </div>
                    <Badge variant="secondary">Database</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-600" />
                      <span className="font-medium">Socket.IO</span>
                    </div>
                    <Badge variant="secondary">Real-time</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium">NextAuth.js</span>
                    </div>
                    <Badge variant="secondary">Authentication</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
