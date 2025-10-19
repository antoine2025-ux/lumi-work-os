"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Info,
  Code,
  Layers,
  Network,
  Cpu,
  HardDrive
} from 'lucide-react'

export default function ArchitectureDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Lumi Work OS - Architecture Documentation
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive guide to system architecture, communication patterns, and dependencies
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="layers">System Layers</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="data-flow">Data Flow</TabsTrigger>
            <TabsTrigger value="patterns">Design Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-6 h-6" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  High-level architecture and core principles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Architecture Principles</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Modular Design</h4>
                      <p className="text-sm text-blue-700">
                        Each system component is self-contained with clear interfaces and responsibilities
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Scalable Architecture</h4>
                      <p className="text-sm text-green-700">
                        Built to handle growing teams and increasing data loads
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Real-time Collaboration</h4>
                      <p className="text-sm text-purple-700">
                        WebSocket-based live editing and instant updates
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">AI-First Design</h4>
                      <p className="text-sm text-orange-700">
                        AI capabilities integrated throughout the platform
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Technology Stack</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h4 className="font-medium mb-2 text-gray-900">Frontend</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Next.js 15 (React Framework)</li>
                        <li>• TypeScript (Type Safety)</li>
                        <li>• Tailwind CSS (Styling)</li>
                        <li>• shadcn/ui (Components)</li>
                        <li>• Socket.IO Client (Real-time)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-gray-900">Backend</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Next.js API Routes</li>
                        <li>• Prisma ORM</li>
                        <li>• NextAuth.js</li>
                        <li>• Socket.IO Server</li>
                        <li>• OpenAI API</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-gray-900">Infrastructure</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• PostgreSQL (Database)</li>
                        <li>• Redis (Cache)</li>
                        <li>• Google OAuth</li>
                        <li>• Vercel (Deployment)</li>
                        <li>• CloudFlare (CDN)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layers" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-6 h-6" />
                    Client Layer
                  </CardTitle>
                  <CardDescription>
                    User-facing applications and interfaces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Next.js 15 Web App</h4>
                      <p className="text-sm text-purple-700 mb-3">
                        Main application built with Next.js 15, featuring App Router, Server Components, and optimized performance
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">React 19</Badge>
                        <Badge variant="secondary">TypeScript</Badge>
                        <Badge variant="secondary">App Router</Badge>
                        <Badge variant="secondary">Server Components</Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Mobile App (Planned)</h4>
                      <p className="text-sm text-gray-600">
                        Native mobile application for iOS and Android platforms
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Desktop App (Planned)</h4>
                      <p className="text-sm text-gray-600">
                        Electron-based desktop application for Windows, macOS, and Linux
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Frontend Components
                  </CardTitle>
                  <CardDescription>
                    User interface components and pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">Dashboard</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Main dashboard with quick actions, recent activity, and AI suggestions
                      </p>
                      <Badge variant="outline">Overview & Navigation</Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">Wiki System</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Knowledge management with rich text editing and collaboration
                      </p>
                      <Badge variant="outline">Content Management</Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">Project Management</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Project and task management with Kanban boards
                      </p>
                      <Badge variant="outline">Task Management</Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">AI Assistant</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        AI-powered chat and content generation
                      </p>
                      <Badge variant="outline">AI Integration</Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">Onboarding System</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Employee onboarding and progress tracking
                      </p>
                      <Badge variant="outline">HR Management</Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-medium text-indigo-900 mb-2">Real-time Collaboration</h4>
                      <p className="text-sm text-indigo-700 mb-2">
                        Live editing and real-time updates
                      </p>
                      <Badge variant="outline">Collaboration</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-6 h-6" />
                    API Layer
                  </CardTitle>
                  <CardDescription>
                    RESTful API endpoints for all major features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Authentication APIs</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <code className="text-sm">POST /api/auth/signin</code>
                          <p className="text-xs text-gray-600 mt-1">User authentication</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <code className="text-sm">GET /api/auth/session</code>
                          <p className="text-xs text-gray-600 mt-1">Session management</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Content APIs</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <code className="text-sm">GET /api/wiki/pages</code>
                          <p className="text-xs text-gray-600 mt-1">Wiki content</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <code className="text-sm">POST /api/projects</code>
                          <p className="text-xs text-gray-600 mt-1">Project management</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-6 h-6" />
                    Core Services
                  </CardTitle>
                  <CardDescription>
                    Backend services that power the application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-medium text-pink-900 mb-2">Authentication Service</h4>
                      <p className="text-sm text-pink-700 mb-2">
                        NextAuth.js-based authentication with Google OAuth integration
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">NextAuth.js</Badge>
                        <Badge variant="outline" className="text-xs">Google OAuth</Badge>
                        <Badge variant="outline" className="text-xs">JWT</Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-medium text-pink-900 mb-2">Database Service</h4>
                      <p className="text-sm text-pink-700 mb-2">
                        Prisma ORM for type-safe database operations
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">Prisma</Badge>
                        <Badge variant="outline" className="text-xs">PostgreSQL</Badge>
                        <Badge variant="outline" className="text-xs">Type Safety</Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-medium text-pink-900 mb-2">Real-time Service</h4>
                      <p className="text-sm text-pink-700 mb-2">
                        Socket.IO for live collaboration and updates
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">Socket.IO</Badge>
                        <Badge variant="outline" className="text-xs">WebSockets</Badge>
                        <Badge variant="outline" className="text-xs">Live Updates</Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <h4 className="font-medium text-pink-900 mb-2">AI Service</h4>
                      <p className="text-sm text-pink-700 mb-2">
                        OpenAI GPT-4 integration for AI capabilities
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">OpenAI</Badge>
                        <Badge variant="outline" className="text-xs">GPT-4</Badge>
                        <Badge variant="outline" className="text-xs">Streaming</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-6 h-6" />
                  Communication Patterns
                </CardTitle>
                <CardDescription>
                  How different systems communicate and exchange data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Request-Response Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Client → API → Service → Database</div>
                      <Badge variant="secondary">HTTP/REST</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Used for: User authentication, data retrieval, CRUD operations</p>
                      <p>• Protocol: HTTP/HTTPS with JSON payloads</p>
                      <p>• Response time: 100-500ms typical</p>
                      <p>• Error handling: HTTP status codes with detailed error messages</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Real-time Communication</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Client ↔ WebSocket ↔ Service ↔ Database</div>
                      <Badge variant="secondary">WebSocket</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Used for: Live editing, real-time updates, notifications</p>
                      <p>• Protocol: WebSocket with Socket.IO</p>
                      <p>• Response time: &lt;50ms typical</p>
                      <p>• Features: Automatic reconnection, room management, presence tracking</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">AI Integration Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Client → AI API → OpenAI → Response</div>
                      <Badge variant="secondary">Streaming</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Used for: Chat responses, content generation, analysis</p>
                      <p>• Protocol: HTTP with Server-Sent Events (SSE)</p>
                      <p>• Response time: 1-5 seconds for complex requests</p>
                      <p>• Features: Streaming responses, conversation context, token management</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Caching Strategy</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Service → Redis → Database</div>
                      <Badge variant="secondary">Cache-Aside</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Used for: Frequently accessed data, session storage</p>
                      <p>• Protocol: Redis with TTL expiration</p>
                      <p>• Response time: &lt;10ms for cache hits</p>
                      <p>• Features: Automatic invalidation, distributed caching, memory optimization</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDown className="w-6 h-6" />
                  Data Flow Patterns
                </CardTitle>
                <CardDescription>
                  How data moves through the system from user input to storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">User Authentication Flow</h3>
                  <div className="space-y-3">
                    {[
                      { step: 1, action: "User clicks 'Sign In'", component: "Browser" },
                      { step: 2, action: "Redirects to Google OAuth", component: "Next.js App" },
                      { step: 3, action: "User authenticates with Google", component: "Google OAuth" },
                      { step: 4, action: "OAuth callback with user data", component: "NextAuth.js" },
                      { step: 5, action: "Creates/updates user in database", component: "Prisma ORM" },
                      { step: 6, action: "Generates JWT session token", component: "NextAuth.js" },
                      { step: 7, action: "Redirects to dashboard", component: "Next.js App" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.action}</div>
                          <div className="text-sm text-gray-600">{item.component}</div>
                        </div>
                        {index < 6 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Wiki Content Creation Flow</h3>
                  <div className="space-y-3">
                    {[
                      { step: 1, action: "User creates new wiki page", component: "Wiki Component" },
                      { step: 2, action: "Validates content and permissions", component: "Wiki API" },
                      { step: 3, action: "Processes markdown and metadata", component: "Wiki Module" },
                      { step: 4, action: "Generates AI analysis and tags", component: "AI Service" },
                      { step: 5, action: "Stores content in database", component: "Prisma ORM" },
                      { step: 6, action: "Updates search index", component: "Search Service" },
                      { step: 7, action: "Notifies team members", component: "Socket.IO" },
                      { step: 8, action: "Updates UI in real-time", component: "Frontend" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.action}</div>
                          <div className="text-sm text-gray-600">{item.component}</div>
                        </div>
                        {index < 7 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">AI Chat Flow</h3>
                  <div className="space-y-3">
                    {[
                      { step: 1, action: "User sends message", component: "AI Component" },
                      { step: 2, action: "Validates and processes request", component: "AI API" },
                      { step: 3, action: "Retrieves conversation context", component: "Database Service" },
                      { step: 4, action: "Sends to OpenAI with context", component: "AI Service" },
                      { step: 5, action: "Streams response back", component: "OpenAI API" },
                      { step: 6, action: "Updates conversation history", component: "Database Service" },
                      { step: 7, action: "Displays response to user", component: "AI Component" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.action}</div>
                          <div className="text-sm text-gray-600">{item.component}</div>
                        </div>
                        {index < 6 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  Design Patterns
                </CardTitle>
                <CardDescription>
                  Architectural patterns and best practices used in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Layered Architecture</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      The system follows a layered architecture pattern with clear separation of concerns:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Presentation Layer (Frontend Components)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">API Layer (REST Endpoints)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Service Layer (Business Logic)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Data Access Layer (Prisma ORM)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Database Layer (PostgreSQL)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Repository Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Data access is abstracted through Prisma ORM, providing a clean interface between business logic and data storage:
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Centralized data access logic</p>
                      <p>• Type-safe database operations</p>
                      <p>• Easy testing with mock implementations</p>
                      <p>• Database-agnostic business logic</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Observer Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Real-time updates use the Observer pattern through Socket.IO for live collaboration:
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Users subscribe to specific rooms/channels</p>
                      <p>• Changes are broadcast to all subscribers</p>
                      <p>• Automatic reconnection and error handling</p>
                      <p>• Presence tracking and user management</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Strategy Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      AI service uses different strategies for different types of requests:
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Chat responses vs. content generation</p>
                      <p>• Different AI models for different tasks</p>
                      <p>• Configurable prompts and parameters</p>
                      <p>• Easy to add new AI capabilities</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Factory Pattern</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Component creation and configuration uses factory patterns:
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Dynamic component creation based on type</p>
                      <p>• Consistent configuration across components</p>
                      <p>• Easy to extend with new component types</p>
                      <p>• Centralized component management</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
