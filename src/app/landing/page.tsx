"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ScreenshotPreview } from "@/components/landing/screenshot-preview";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { KanbanPreview } from "@/components/landing/kanban-preview";
import { WikiPreview } from "@/components/landing/wiki-preview";
import { AIAssistantPreview } from "@/components/landing/ai-assistant-preview";
import { NewsletterSignup } from "@/components/landing/newsletter-signup";
import { EarlyTesterSignup } from "@/components/landing/early-tester-signup";
import { WaitlistSignupModal } from "@/components/landing/waitlist-signup-modal";
import { 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Zap, 
  Shield, 
  Brain,
  Workflow,
  BookOpen,
  TrendingUp,
  Menu,
  X,
  Monitor,
  Smartphone,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);

  const handleSignIn = () => {
    // Redirect to main app's login page (same domain)
    router.push('/login');
  };

  const handleSignUp = () => {
    // Redirect to main app's login page (same as sign in for OAuth)
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Status Banner - Top of Page */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 border-b border-blue-500/30 sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-white">
              <span className="inline-block mr-2">🚀</span>
              <span className="font-bold">Early-stage, high-impact.</span> Loopwell is in private beta.{" "}
              <button
                onClick={() => setWaitlistModalOpen(true)}
                className="underline hover:text-blue-200 transition-colors font-bold cursor-pointer decoration-2 underline-offset-2 hover:decoration-blue-200"
              >
                Join the waitlist
              </button>{" "}
              to get early access, influence the roadmap, and unlock perks reserved for our first users.
            </p>
          </div>
        </div>
      </div>

      {/* Waitlist Signup Modal */}
      <WaitlistSignupModal open={waitlistModalOpen} onOpenChange={setWaitlistModalOpen} />

      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-[57px] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Logo 
                width={32} 
                height={32} 
                className="w-8 h-8"
                variant="dark"
              />
              <span className="text-xl font-bold text-white">Loopwell</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#preview" className="text-slate-300 hover:text-white transition-colors">Preview</a>
              <a href="#benefits" className="text-slate-300 hover:text-white transition-colors">Benefits</a>
              <a href="/blog" className="text-slate-300 hover:text-white transition-colors">Blog</a>
              <a 
                href="#become-a-tester" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Become a Tester
              </a>
              <a 
                href="/login" 
                onClick={(e) => {
                  e.preventDefault();
                  handleSignIn();
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </a>
              <a 
                href="/login" 
                onClick={(e) => {
                  e.preventDefault();
                  handleSignUp();
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Sign Up
              </a>
            </div>
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-700 bg-slate-900 py-4">
              <div className="flex flex-col space-y-3 px-4">
                <a 
                  href="#features" 
                  className="text-slate-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#preview" 
                  className="text-slate-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Preview
                </a>
                <a 
                  href="#benefits" 
                  className="text-slate-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Benefits
                </a>
                <a 
                  href="/blog" 
                  className="text-slate-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </a>
                <a 
                  href="#become-a-tester" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Become a Tester
                </a>
                <a 
                  href="/login" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </a>
                <a 
                  href="/login" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSignUp();
                    setMobileMenuOpen(false);
                  }}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Sign Up
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              The <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">End</span> of Disconnected Work.
            </h1>
            
            <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy. It connects projects, knowledge, and people into one system that builds alignment, discipline, and momentum from day one.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="px-8 py-4 text-lg" onClick={handleSignUp}>
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg" onClick={() => {
                const featuresSection = document.getElementById('features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Learn More
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                AI-powered
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                Secure
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                Free to start
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              The Architecture of Organizational Intelligence
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              From contextual AI to connected documentation and project intelligence, Loopwell gives you the core systems that make collaboration self-sustaining.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-white">Organizational Intelligence</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Forget "AI assistants." Loopwell doesn't guess, it understands. It reads the room, connects the dots across your projects, and gives you answers that feel like they came from inside your team's collective brain.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Workflow className="w-6 h-6 text-green-400" />
                  </div>
                  <CardTitle className="text-white">Smart Project Management</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Less managing, more momentum. Tasks assign themselves, blockers surface before they become problems, and your team always knows what matters most, no stand-ups required.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Living Knowledge Base</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Your company's memory, finally alive. Every idea, document, and decision stays connected to where it came from. No hunting through folders. No "who wrote this?" moments. Just instant context.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                  <CardTitle className="text-white">Seamless Collaboration</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Work without friction. Loopwell synchronizes updates, context, and communication automatically, so your team can focus on thinking, not typing status reports.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-red-400" />
                  </div>
                  <CardTitle className="text-white">Enterprise Security</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Freedom without compromise. Every workspace runs in a secure, isolated environment, giving startups the kind of data protection usually reserved for global enterprises.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border border-slate-700 bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-indigo-400" />
                  </div>
                  <CardTitle className="text-white">Lightning Fast</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Because context loses value in slow motion. Loopwell delivers sub-second search, instant sync, and responses that keep up with how fast your team moves.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Visual Preview Section */}
      <section id="preview" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              See Loopwell in Action
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              A first look at work that runs itself. Watch how Loopwell understands context, adapts to your team, and moves projects forward automatically.
            </p>
          </div>

          <div className="space-y-16">
            {/* Dashboard Preview */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="w-6 h-6 text-blue-400" />
                <h3 className="text-2xl font-semibold text-white">Dashboard Overview</h3>
              </div>
              <DashboardPreview />
            </div>

            {/* Project Management Preview */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Workflow className="w-6 h-6 text-green-400" />
                <h3 className="text-2xl font-semibold text-white">Project Management</h3>
              </div>
              <KanbanPreview />
            </div>

            {/* Wiki/Knowledge Base Preview */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-semibold text-white">Spaces</h3>
              </div>
              <WikiPreview />
            </div>

            {/* AI Assistant Preview */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-6 h-6 text-blue-400" />
                <h3 className="text-2xl font-semibold text-white">LoopBrain</h3>
              </div>
              <AIAssistantPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Loopwell
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Join us in building the future of workplace productivity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">25%</div>
              <div className="text-slate-300">Productivity Increase</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">10+</div>
              <div className="text-slate-300">Hours Saved Per Week</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">90%</div>
              <div className="text-slate-300">Reduction in Repeated Questions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">95%</div>
              <div className="text-slate-300">On-Time Project Completion</div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Built for Modern Teams
              </h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-4 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Calm & Minimal Design</h4>
                    <p className="text-slate-300">Reduce cognitive load with our thoughtfully designed interface that focuses on what matters most.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-4 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">AI That Actually Helps</h4>
                    <p className="text-slate-300">Our AI doesn&apos;t just look smart—it provides real value by understanding your context and needs.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-4 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Built for Scale</h4>
                    <p className="text-slate-300">From startup to enterprise, Loopwell will grow with you without compromising on performance or security.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Real-time Analytics</h4>
                    <p className="text-blue-100">Track your team&apos;s progress</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Project Completion</span>
                    <span className="font-semibold">95%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{width: '95%'}}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Team Productivity</span>
                    <span className="font-semibold">+25%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Knowledge Retention</span>
                    <span className="font-semibold">90%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{width: '90%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become a Tester Section */}
      <section id="become-a-tester" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Test Loopwell Before the World Sees It
          </h2>
          <p className="text-xl text-slate-300 mb-4 max-w-3xl mx-auto">
            We're inviting a small group of early adopters to test the platform, share feedback, and shape its evolution.
          </p>
          <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto">
            Early testers receive lifetime access perks and a permanent spot in our founding community.
          </p>
          
          <EarlyTesterSignup />
          
          <div className="mt-12 pt-12 border-t border-slate-700">
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center md:text-left">
                  Lifetime Benefits
                </h3>
                <p className="text-slate-400 text-sm text-center md:text-left mb-2">
                  Early testers keep special access and perks tied to their founding membership.
                </p>
                <p className="text-slate-500 text-xs text-center md:text-left italic">
                  *Feature availability and tier structure may change after public launch.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center md:text-left">
                  Founding Community
                </h3>
                <p className="text-slate-400 text-sm text-center md:text-left">
                  Join an exclusive group of early adopters who helped shape Loopwell.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <Sparkles className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center md:text-left">
                  Direct Influence
                </h3>
                <p className="text-slate-400 text-sm text-center md:text-left">
                  Your feedback directly impacts product development and new features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Sign in now to access your workspace and start collaborating with your team.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-8 py-4 text-lg"
            onClick={handleSignUp}
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo 
                  width={32} 
                  height={32} 
                  className="w-8 h-8"
                  variant="dark"
                />
                <span className="text-xl font-bold">Loopwell</span>
              </div>
              <p className="text-slate-400 mb-6">
                The intelligent workplace platform that brings teams together.
              </p>
              <div>
                <h4 className="font-semibold mb-3 text-white">Newsletter</h4>
                <p className="text-sm text-slate-400 mb-3">
                  Subscribe to get updates and news.
                </p>
                <NewsletterSignup />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Benefits</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Sign In</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-400 text-sm">&copy; 2025 Loopwell. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <a href="/dev-login" className="hover:text-white transition-colors">Dev Login</a>
                <span className="text-slate-600">•</span>
                <a href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</a>
                <span className="text-slate-600">•</span>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <span className="text-slate-600">•</span>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
