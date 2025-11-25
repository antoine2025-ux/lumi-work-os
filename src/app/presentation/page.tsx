"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ArrowLeft, Zap, Users, Target, Rocket, Brain, Layers, Sparkles, Globe, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LoopbrainDiagram } from "@/components/presentation/loopbrain-diagram"

interface Slide {
  id: number
  title: string
  subtitle?: string
  content: React.ReactNode
  bgGradient?: string
}

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const slides: Slide[] = [
    {
      id: 1,
      title: "Welcome to Loopwell",
      subtitle: "The End of Disconnected Workspaces",
      content: (
        <div className="space-y-8 text-center">
          <div className="mt-12 flex justify-center gap-4">
            <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <img 
                src="/white.png" 
                alt="Loopwell Logo" 
                className="w-32 h-32 mx-auto object-contain"
              />
            </div>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-blue-900/20 to-slate-900"
    },
    {
      id: 2,
      title: "The Problem",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <p className="text-3xl font-bold text-white mb-8 text-center">
            Teams are not unproductive. They're drowning in tools.
          </p>
          
          <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Tool sprawl is out of control:</h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <div>
                  <span>The average company uses 130 SaaS applications</span>
                  <p className="text-xs text-slate-400 mt-1">Source: BetterCloud, 2023 State of SaaSOps</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <div>
                  <span>Knowledge workers switch between 9+ apps per day</span>
                  <p className="text-xs text-slate-400 mt-1">Source: Asana, 2022 Anatomy of Work Report</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <div>
                  <span>Workers context-switch 1,200 times per day</span>
                  <p className="text-xs text-slate-400 mt-1">Source: Qatalog & Cornell University, The Cost of Work Coordination</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <div>
                  <span>Employees spend 3.6 hours per day searching for information across apps</span>
                  <p className="text-xs text-slate-400 mt-1">Source: Gartner, Digital Worker Survey 2023</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
            <p className="text-xl font-semibold text-white text-center">
              Context gets scattered — alignment breaks — decisions slow down.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-red-900/20 to-slate-900"
    },
    {
      id: 3,
      title: "The Cost of the Problem",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <p className="text-3xl font-bold text-white mb-8 text-center">
            Tool sprawl has massive financial and productivity costs.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Financial waste:</h3>
              <ul className="space-y-3 text-slate-300 text-sm mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">•</span>
                  <div>
                    <span>Companies waste ~20% of SaaS spend on underused tools</span>
                    <p className="text-xs text-slate-400 mt-1">Source: Gartner, 2023 SaaS Management Report</p>
                  </div>
                </li>
              </ul>
              <div className="p-4 bg-slate-800/50 rounded border border-slate-700 mb-4">
                <p className="text-sm font-semibold text-white mb-2">A 20-person team easily spends:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Notion → $160/mo</li>
                  <li>• Linear/Jira → $200–300/mo</li>
                  <li>• Loom → $200/mo</li>
                  <li>• Otter.ai / Notetaker tools → $200/mo</li>
                  <li>• ChatGPT Pro / Claude → $400–600/mo</li>
                </ul>
                <p className="text-xs text-slate-400 mt-2">Source: Public pricing from each provider</p>
                <p className="text-sm font-semibold text-orange-400 mt-3">≈ $1,000–1,400 per month</p>
                <p className="text-xs text-slate-400 mt-1">not including Slack, analytics, calendar, HRIS, etc.</p>
              </div>
            </div>

            <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Productivity cost:</h3>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span>Employees lose 26% of their workday to "work about work" → tool switching, searching, realigning</span>
                    <p className="text-xs text-slate-400 mt-1">Source: Asana, Anatomy of Work 2021–2023</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span>Teams lose 7 hours/week looking for documents and context</span>
                    <p className="text-xs text-slate-400 mt-1">Source: Freshworks, State of Workplace Productivity 2023</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span>Fragmented tools create "friction cost" equal to $9,000+ per employee per year</span>
                    <p className="text-xs text-slate-400 mt-1">Source: McKinsey, The Productivity Drain</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
            <p className="text-xl font-semibold text-white text-center">
              Fragmentation acts like a hidden tax on every team — in money, time, and morale.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-orange-900/20 to-slate-900"
    },
    {
      id: 4,
      title: "The Lost Opportunity",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <p className="text-3xl font-bold text-white mb-8 text-center">
            Teams could operate 20–30% more efficiently if context lived in one place.
          </p>
          
          <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">What teams miss out on:</h3>
            <ul className="space-y-3 text-slate-300 text-sm mb-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <div>
                  <span>Instant status visibility ("What's the status of Project X?" should be answered instantly)</span>
                  <p className="text-xs text-slate-400 mt-1">Source: McKinsey, Future of Work Productivity Report 2023</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Automatic alignment — instead of repeating info across Slack, Notion, Linear</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <div>
                  <span className="font-semibold">AI that understands:</span>
                  <ul className="ml-4 mt-2 space-y-1 text-xs">
                    <li>• Roles</li>
                    <li>• Responsibilities</li>
                    <li>• Priorities</li>
                    <li>• Org structure</li>
                    <li>• Project progress</li>
                    <li>• Meeting notes</li>
                    <li>• Documentation</li>
                  </ul>
                  <p className="text-xs text-slate-400 mt-2">(Not an external source — this is the core vision of Loopwell)</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Why current AI doesn't fix this:</h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <div>
                  <span>LLMs are powerful but have no persistent context</span>
                  <p className="text-xs text-slate-400 mt-1">Source: Stanford HAI, LLM Limitations 2023</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <div>
                  <span>They cannot connect the dots across tools without human effort</span>
                  <p className="text-xs text-slate-400 mt-1">Source: MIT Sloan Review, The Missing Middle of AI Adoption 2024</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
            <p className="text-xl font-semibold text-white text-center">
              Companies don't just lose time — they lose the ability to operate intelligently.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-blue-900/30 to-slate-900"
    },
    {
      id: 5,
      title: "How Loopbrain Works",
      subtitle: "The Intelligence Architecture",
      content: (
        <div className="space-y-6 max-w-7xl mx-auto">
          <p className="text-xl text-slate-300 text-center mb-8">
            Most AI tools are assistants. Loopwell is infrastructure.
          </p>
          <LoopbrainDiagram />
        </div>
      ),
      bgGradient: "from-slate-900 via-purple-900/30 to-slate-900"
    },
    {
      id: 6,
      title: "Key Features",
      content: (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <FileText className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Wiki System</h3>
              <p className="text-slate-300 text-sm mb-3">Hierarchical documentation with AI-powered search and citations</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Markdown-based editing</li>
                <li>• Version control</li>
                <li>• Semantic search</li>
              </ul>
            </div>
            <div className="p-6 bg-green-500/10 rounded-lg border border-green-500/20">
              <Target className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Project Management</h3>
              <p className="text-slate-300 text-sm mb-3">Kanban boards with epics, tasks, and AI-powered insights</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Task tracking</li>
                <li>• Epic organization</li>
                <li>• Status monitoring</li>
              </ul>
            </div>
            <div className="p-6 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Brain className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Contextual AI Assistant</h3>
              <p className="text-slate-300 text-sm mb-3">Understands your workspace context and helps you act</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Intent routing</li>
                <li>• Content drafting</li>
                <li>• Task extraction</li>
              </ul>
            </div>
            <div className="p-6 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <Users className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Org Chart & Roles</h3>
              <p className="text-slate-300 text-sm mb-3">Visual organization structure with role cards and responsibilities</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Interactive org chart</li>
                <li>• Role definitions</li>
                <li>• Team management</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg border border-blue-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Multi-LLM Architecture</h3>
            </div>
            <p className="text-slate-300 text-sm">
              Loopwell integrates multiple leading language models (GPT, Claude, Gemini) natively. 
              Each model has unique strengths; Loopwell lets you tap into the right intelligence for the right task.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-indigo-900/20 to-slate-900"
    },
    {
      id: 7,
      title: "How It Works",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-3xl font-bold text-blue-400 mb-2">1</div>
                <h3 className="text-lg font-semibold text-white mb-2">Page Context Mode</h3>
                <p className="text-slate-300 text-sm">
                  When you're inside a page, AI drafts content directly into the editor. 
                  It understands the current context and enhances what you're working on.
                </p>
              </div>
              <div className="p-6 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="text-3xl font-bold text-purple-400 mb-2">2</div>
                <h3 className="text-lg font-semibold text-white mb-2">Global Mode</h3>
                <p className="text-slate-300 text-sm">
                  From the dashboard, AI helps you create new pages, projects, or tasks. 
                  It asks clarifying questions and navigates you to the right place.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-3xl font-bold text-green-400 mb-2">3</div>
                <h3 className="text-lg font-semibold text-white mb-2">Contextual Intelligence</h3>
                <p className="text-slate-300 text-sm">
                  AI retrieves context from projects, tasks, docs, meeting notes, and org structure. 
                  It synthesizes data to provide grounded, actionable answers.
                </p>
              </div>
              <div className="p-6 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="text-3xl font-bold text-orange-400 mb-2">4</div>
                <h3 className="text-lg font-semibold text-white mb-2">Continuous Learning</h3>
                <p className="text-slate-300 text-sm">
                  The system continuously connects dots across your work, linking projects, 
                  notes, decisions, and people so nothing gets buried.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-lg text-slate-300 text-center">
              <span className="text-white font-semibold">AI behaves like a virtual COO,</span> not a generic chatbot.
              <br />
              It understands your company structure, ongoing projects, and history.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-green-900/20 to-slate-900"
    },
    {
      id: 8,
      title: "The Benefits",
      content: (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30">
              <Zap className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Faster Project Completion</h3>
              <p className="text-slate-300">
                Context stays connected. No more hunting for information across tools. 
                AI helps you move from idea to action without the noise.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30">
              <Users className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Shorter Onboarding Cycles</h3>
              <p className="text-slate-300">
                New team members get up to speed faster. Everything they need is in one place, 
                with AI to guide them through the organization.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg border border-purple-500/30">
              <Target className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Fewer Meetings & Handovers</h3>
              <p className="text-slate-300">
                Information is accessible and connected. Decisions are documented. 
                Context doesn't get lost in Slack threads or email chains.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30">
              <Rocket className="w-12 h-12 text-orange-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Higher-Impact Output</h3>
              <p className="text-slate-300">
                Teams move faster without losing alignment. Build a bulletproof foundation from day one, 
                maintain context as you scale.
              </p>
            </div>
          </div>
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-lg border border-indigo-500/30">
            <p className="text-xl font-semibold text-white text-center mb-2">
              Startups can think, scale, and operate like mature organizations from the start.
            </p>
            <p className="text-slate-300 text-center text-sm">
              Eliminate half a dozen disconnected tools. Grow without losing focus or burning cash on licenses.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-indigo-900/30 to-slate-900"
    },
    {
      id: 9,
      title: "Our Mission",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="p-8 md:p-12 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
            <Globe className="w-12 h-12 md:w-16 md:h-16 text-blue-400 mx-auto mb-6" />
            <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-relaxed text-center">
              Build the first workplace platform powered by Contextual AI, an AI that behaves like a proactive team member, not a chatbot.
            </p>
            
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">It understands</h3>
              <p className="text-slate-300 text-sm">
                Your people, your projects, and your company's priorities.
              </p>
            </div>
            <div className="p-6 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">It remembers</h3>
              <p className="text-slate-300 text-sm">
                Everything, every decision, note, task, and role.
              </p>
            </div>
            <div className="p-6 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">It connects</h3>
              <p className="text-slate-300 text-sm">
                Every decision, note, task, and role into one shared brain.
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-lg md:text-xl text-slate-300 mb-4 text-center">
              So your team stays aligned without chaos, moves faster with full context, 
              and operates with intelligence instead of juggling tools.
            </p>
            <p className="text-xl md:text-2xl font-bold text-white text-center">
              The future of work isn't more software.
              <br />
              <span className="text-blue-400">It's a smarter system that finally understands your company.</span>
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-blue-900/40 to-purple-900/40"
    },
    {
      id: 10,
      title: "The Problem, Summarized",
      content: (
        <div className="space-y-8 max-w-5xl mx-auto">
          <p className="text-3xl font-bold text-white mb-8 text-center">
            Teams are drowning in tools, paying hidden costs, and missing opportunities.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">The Problem</h3>
              <ul className="space-y-2 text-slate-300 text-sm mb-4">
                <li>• 130 SaaS apps per company</li>
                <li>• 9+ apps switched daily</li>
                <li>• 1,200 context-switches/day</li>
                <li>• 3.6 hours searching for info</li>
              </ul>
              <p className="text-xs text-red-400 font-semibold mt-4">
                Context gets scattered — alignment breaks — decisions slow down.
              </p>
            </div>

            <div className="p-6 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">The Cost</h3>
              <ul className="space-y-2 text-slate-300 text-sm mb-4">
                <li>• $1,000–1,400/mo per team</li>
                <li>• 26% lost to "work about work"</li>
                <li>• 7 hours/week searching</li>
                <li>• $9,000+ friction cost/employee</li>
              </ul>
              <p className="text-xs text-orange-400 font-semibold mt-4">
                Fragmentation acts like a hidden tax — in money, time, and morale.
              </p>
            </div>

            <div className="p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">The Lost Opportunity</h3>
              <ul className="space-y-2 text-slate-300 text-sm mb-4">
                <li>• 20–30% efficiency loss</li>
                <li>• No instant status visibility</li>
                <li>• AI without context</li>
                <li>• No persistent memory</li>
              </ul>
              <p className="text-xs text-blue-400 font-semibold mt-4">
                Companies don't just lose time — they lose the ability to operate intelligently.
              </p>
            </div>
          </div>

          <div className="mt-8 p-8 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-blue-500/20 rounded-lg border border-red-500/30">
            <p className="text-2xl font-bold text-white text-center mb-4">
              This is not a productivity issue.
            </p>
            <p className="text-xl font-semibold text-slate-200 text-center">
              It's a structural intelligence issue.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-red-900/20 to-slate-900"
    },
    {
      id: 11,
      title: "Pricing",
      content: (
        <div className="space-y-8 max-w-6xl mx-auto">
          <p className="text-3xl font-bold text-white mb-8 text-center">
            One platform replaces multiple tools — save money and gain intelligence.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter Tier */}
            <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$29</span>
                <span className="text-slate-400 text-lg">/user/mo</span>
              </div>
              <p className="text-slate-300 text-sm mb-6">Perfect for small teams getting started</p>
              <ul className="space-y-3 text-slate-300 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Up to 10 team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Unlimited projects & docs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Contextual AI assistant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Basic integrations</span>
                </li>
              </ul>
            </div>

            {/* Growth Tier - Featured */}
            <div className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg border-2 border-blue-500/50 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 px-4 py-1 rounded-full text-xs font-semibold text-white">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-2">Growth</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-slate-400 text-lg">/user/mo</span>
              </div>
              <p className="text-slate-300 text-sm mb-6">For growing teams that need more</p>
              <ul className="space-y-3 text-slate-300 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">✓</span>
                  <span>Up to 50 team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">✓</span>
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">✓</span>
                  <span>Advanced AI features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">✓</span>
                  <span>Custom integrations</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Tier */}
            <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <p className="text-slate-300 text-sm mb-6">For organizations that need scale</p>
              <ul className="space-y-3 text-slate-300 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Unlimited team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Everything in Growth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>SLA guarantees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Custom deployment</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
            <p className="text-xl font-semibold text-white text-center mb-2">
              Replace $1,000–1,400/month in tool costs with one intelligent platform.
            </p>
            <p className="text-slate-300 text-center text-sm">
              All tiers include: Wiki, Projects, AI Assistant, Org Chart, and more — no additional fees.
            </p>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-blue-900/30 to-slate-900"
    },
    {
      id: 12,
      title: "Get Started",
      content: (
        <div className="space-y-8 max-w-3xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg border border-blue-500/30">
            <Rocket className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Workspace?</h2>
            <p className="text-xl text-slate-300 mb-8">
              Join the teams building with Organizational Intelligence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
                  Get Started
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6 text-sm text-slate-400">
            <div>
              <div className="font-semibold text-white mb-2">One Platform</div>
              <div>Projects, docs, and AI in one place</div>
            </div>
            <div>
              <div className="font-semibold text-white mb-2">Context-Aware</div>
              <div>AI that understands your organization</div>
            </div>
            <div>
              <div className="font-semibold text-white mb-2">Built to Scale</div>
              <div>From startup to enterprise</div>
            </div>
          </div>
        </div>
      ),
      bgGradient: "from-slate-900 via-blue-900/30 to-indigo-900/30"
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }
      if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
      }
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
      if (e.key === "f" || e.key === "F") {
        setIsFullscreen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFullscreen, slides.length])

  const currentSlideData = slides[currentSlide]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentSlideData.bgGradient || "from-slate-900 to-slate-900"} transition-all duration-1000`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div className="text-slate-400 text-sm">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="w-full max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center mb-6">
              {currentSlideData.title}
            </h1>
            {currentSlideData.subtitle && (
              <p className="text-2xl sm:text-3xl md:text-4xl text-slate-300 text-center mb-4 font-semibold">{currentSlideData.subtitle}</p>
            )}
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {currentSlideData.content}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={prevSlide}
          className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Slide Indicators */}
        <div className="flex gap-2 items-center bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-blue-500 w-8"
                  : "bg-slate-600 hover:bg-slate-500"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextSlide}
          className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="fixed bottom-4 right-4 z-50 text-xs text-slate-500 bg-slate-800/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700">
        <div>← → Navigate</div>
        <div>F Fullscreen</div>
      </div>
    </div>
  )
}

