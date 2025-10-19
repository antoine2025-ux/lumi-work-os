"use client"

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Network, 
  BookOpen, 
  Code, 
  ArrowRight,
  Layers,
  Database,
  Server,
  Globe,
  Bot,
  Zap,
  Users,
  FileText,
  Kanban,
  Shield
} from 'lucide-react'

export default function ArchitecturePage() {
  const systemComponents = [
    {
      name: "Frontend Layer",
      description: "User interface and client-side components",
      icon: Globe,
      color: "bg-blue-100 border-blue-300 text-blue-800",
      components: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "shadcn/ui"]
    },
    {
      name: "API Layer",
      description: "RESTful endpoints and API services",
      icon: Server,
      color: "bg-yellow-100 border-yellow-300 text-yellow-800",
      components: ["Next.js API Routes", "Authentication APIs", "Content APIs", "AI APIs"]
    },
    {
      name: "Core Services",
      description: "Backend services and business logic",
      icon: Code,
      color: "bg-pink-100 border-pink-300 text-pink-800",
      components: ["NextAuth.js", "Prisma ORM", "Socket.IO", "OpenAI Integration"]
    },
    {
      name: "Data Layer",
      description: "Database and data storage",
      icon: Database,
      color: "bg-green-100 border-green-300 text-green-800",
      components: ["PostgreSQL", "Redis Cache", "User Data", "Content Data"]
    }
  ]

  const keyFeatures = [
    {
      name: "Real-time Collaboration",
      description: "Live editing and instant updates using WebSockets",
      icon: Zap,
      color: "bg-purple-50 text-purple-700"
    },
    {
      name: "AI Integration",
      description: "GPT-4 powered chat and content generation",
      icon: Bot,
      color: "bg-blue-50 text-blue-700"
    },
    {
      name: "Knowledge Management",
      description: "Wiki system with rich text editing and search",
      icon: FileText,
      color: "bg-green-50 text-green-700"
    },
    {
      name: "Project Management",
      description: "Kanban boards and task management",
      icon: Kanban,
      color: "bg-orange-50 text-orange-700"
    },
    {
      name: "Team Onboarding",
      description: "Structured onboarding and progress tracking",
      icon: Users,
      color: "bg-indigo-50 text-indigo-700"
    },
    {
      name: "Security",
      description: "Role-based access control and authentication",
      icon: Shield,
      color: "bg-red-50 text-red-700"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Lumi Work OS - System Architecture
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Explore the architecture, understand system interactions, and learn how all components work together
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/architecture/diagram">
              <Button size="lg" className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Interactive Diagram
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/architecture/docs">
              <Button variant="outline" size="lg" className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Documentation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-6 h-6" />
                System Architecture Overview
              </CardTitle>
              <CardDescription>
                Four-layer architecture with clear separation of concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemComponents.map((component, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${component.color}`}>
                      <component.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{component.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{component.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {component.components.map((comp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Key Features & Capabilities
              </CardTitle>
              <CardDescription>
                Core functionality and system capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {keyFeatures.map((feature, index) => (
                  <div key={index} className={`p-4 rounded-lg ${feature.color}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <feature.icon className="w-5 h-5" />
                      <h4 className="font-medium">{feature.name}</h4>
                    </div>
                    <p className="text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
              <CardDescription>
                Current implementation status and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">15+</div>
                  <div className="text-sm text-gray-600">API Endpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">8</div>
                  <div className="text-sm text-gray-600">Core Services</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">5</div>
                  <div className="text-sm text-gray-600">Business Modules</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
                  <div className="text-sm text-gray-600">TypeScript Coverage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technology Stack */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
              <CardDescription>
                Modern technologies powering the Lumi Work OS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Frontend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">Next.js 15</span>
                      <Badge variant="secondary">Framework</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">React 19</span>
                      <Badge variant="secondary">Library</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">TypeScript</span>
                      <Badge variant="secondary">Language</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">Tailwind CSS</span>
                      <Badge variant="secondary">Styling</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Backend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Prisma ORM</span>
                      <Badge variant="secondary">Database</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">NextAuth.js</span>
                      <Badge variant="secondary">Auth</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Socket.IO</span>
                      <Badge variant="secondary">Real-time</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">OpenAI API</span>
                      <Badge variant="secondary">AI</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Infrastructure</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm">PostgreSQL</span>
                      <Badge variant="secondary">Database</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm">Redis</span>
                      <Badge variant="secondary">Cache</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm">Google OAuth</span>
                      <Badge variant="secondary">Auth</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm">Vercel</span>
                      <Badge variant="secondary">Hosting</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to explore the architecture?
              </h3>
              <p className="text-gray-600 mb-6">
                Dive deep into the interactive diagram and comprehensive documentation
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/architecture/diagram">
                  <Button size="lg" className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    View Interactive Diagram
                  </Button>
                </Link>
                <Link href="/architecture/docs">
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Read Documentation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}