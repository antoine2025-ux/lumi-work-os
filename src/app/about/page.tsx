import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lightbulb, Zap, Target, Users, Rocket } from "lucide-react"

export const metadata: Metadata = {
  title: "About Loopwell",
  description: "Learn about Loopwell - the unified workspace that brings projects, documentation, and team intelligence together. Discover our mission to build organizational intelligence for growing teams.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-white">About Loopwell</CardTitle>
            <CardDescription className="text-base text-slate-400">
              Building the first workplace platform that truly understands context
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-8 text-slate-300">
              {/* The Problem We're Solving */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">The Problem We're Solving</h2>
                <p className="text-lg text-slate-200">
                  Your team isn't unproductive. You're drowning in tools.
                </p>
                <p className="text-slate-300">
                  Slack for communication. Notion for docs. Linear for projects. ChatGPT for AI. Every tool does one 
                  thing well, but together they create chaos: context gets lost, alignment breaks, decisions slow down.
                </p>
                <p className="font-semibold text-primary mt-4">
                  Loopwell was built to fix that.
                </p>
              </section>

              {/* What Loopwell Does */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">What Loopwell Does</h2>
                <p className="text-slate-300">
                  Loopwell unifies your projects, documentation, and team intelligence into one connected workspace, 
                  powered by <strong className="text-white">Organizational Intelligence (OI)</strong>.
                </p>
                <p className="mt-4 text-slate-300">
                  Instead of jumping between apps to find information, Loopwell's AI continuously connects the dots 
                  across your work: linking projects, notes, decisions, and people so nothing gets buried.
                </p>
                <p className="mt-4 text-slate-300">
                  When you ask Loopwell something, it doesn't generate generic text. It understands your company 
                  (your structure, ongoing projects, history) and helps you act on it.
                </p>
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-blue-400" />
                      <h3 className="font-semibold text-white">Faster project completion</h3>
                    </div>
                  </div>
                  <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <h3 className="font-semibold text-white">Shorter onboarding cycles</h3>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-purple-400" />
                      <h3 className="font-semibold text-white">Fewer meetings and handovers</h3>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="w-5 h-5 text-orange-400" />
                      <h3 className="font-semibold text-white">Higher-impact output at higher speed</h3>
                    </div>
                  </div>
                </div>
              </section>

              {/* What Makes Us Different */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">What Makes Us Different</h2>
                <p className="text-lg font-semibold text-primary mb-4">
                  Most AI tools are assistants. Loopwell is infrastructure.
                </p>
                <p className="text-slate-300">
                  We built an intelligent system that thinks in context. It connects your knowledge, projects, and 
                  teams into one seamless layer that understands what's happening across your organization and helps 
                  you move from idea to action without the noise.
                </p>
                <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Multi-LLM architecture, built in
                  </h3>
                  <p className="text-sm text-slate-300">
                    Loopwell integrates multiple leading language models (GPT, Claude, Gemini, and more) natively. 
                    No juggling subscriptions. Each model has unique strengths; Loopwell lets you tap into the right 
                    intelligence for the right task (documentation, strategy, coding, creative work) from within one 
                    workspace.
                  </p>
                </div>
              </section>

              {/* Why It Matters */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Why It Matters</h2>
                <p className="text-slate-300">
                  Startups and growing teams hit the same wall: they scale faster than their structure.
                </p>
                <p className="mt-4 text-slate-300">
                  Information spreads across tools. Processes break. Costs balloon with every new subscription and 
                  user seat.
                </p>
                <p className="mt-4 text-slate-300">
                  Loopwell solves this by bringing essential tools together (project management, wiki, org chart, AI) 
                  into one platform built for clarity, speed, and scalability.
                </p>
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-lg border border-blue-700/50">
                  <p className="font-semibold text-white mb-3">With Loopwell, startups can:</p>
                  <ul className="list-disc pl-6 space-y-2 text-sm text-slate-300">
                    <li>Build a bulletproof foundation from day one</li>
                    <li>Maintain context as teams and projects multiply</li>
                    <li>Eliminate half a dozen disconnected tools</li>
                    <li>Grow without losing focus or burning cash on licenses</li>
                  </ul>
                </div>
                <p className="mt-4 font-semibold text-white">
                  In short: Loopwell helps young companies think, scale, and operate like mature organizations 
                  from the start.
                </p>
              </section>

              {/* Our Story */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Our Story</h2>
                <p className="text-slate-300">
                  The idea for Loopwell first took shape in early 2023, but it wasn't until early 2025 that the real 
                  work began, turning the concept into a living platform. We saw companies struggling with low 
                  satisfaction, high turnover during probation, new hires taking months to ramp up.
                </p>
                <p className="mt-4 text-slate-300">
                  But while researching the market, we discovered something bigger: onboarding isn't the problem. 
                  It's a symptom.
                </p>
                <p className="mt-4 text-slate-300">
                  The real issue? Organizations lack contextual intelligence. Information is fragmented. Knowledge 
                  lives in people's heads. No system truly understands how a company works.
                </p>
                <p className="mt-4 text-slate-300">
                  So we pivoted. Instead of building another point solution, we built the contextual layer organizations 
                  have been missing: one that unites tools, context, and intelligence into a single ecosystem.
                </p>
                <p className="mt-4 font-semibold text-primary">
                  That's how Loopwell evolved into Organizational Intelligence.
                </p>
              </section>

              {/* Our Mission */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Our Mission</h2>
                <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/30">
                  <p className="text-lg font-semibold text-white mb-2">
                    Build the first workplace platform that truly understands context, so teams can work with clarity 
                    instead of chaos, move faster without losing alignment, and grow intelligently instead of reactively.
                  </p>
                  <p className="mt-4 text-slate-300">
                    We're not chasing AI hype. We're building the system that finally makes sense of it.
                  </p>
                </div>
              </section>

              {/* The Team */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">The Team</h2>
                <p className="text-slate-300">
                  Right now, Loopwell is just me and a clear vision.
                </p>
                <p className="mt-4 text-slate-300">
                  I'm building in public, working with early users, and assembling a team that shares this obsession 
                  with making work calmer, smarter, and more scalable.
                </p>
                <p className="mt-4 font-semibold text-white">
                  Great tools shouldn't compete for your attention. They should quietly amplify it.
                </p>
                <p className="mt-4 text-slate-300">
                  That's what I'm building with Loopwell, one thoughtful feature at a time.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline" className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
          <Link href="/login">
            <Button className="ml-4">
              Get Started
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


