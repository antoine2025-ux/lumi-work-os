"use client";

/**
 * Variant C: Context Layers (Depth-first)
 * 
 * Design principles:
 * - Layered sections with soft background color shifts
 * - Stacked panels with subtle depth cues (light shadows, overlaps)
 * - CSS-only gentle motion (fade-in on scroll, hover lifts)
 * - Gradient backgrounds between sections
 * - Cards that feel like floating layers
 * - Warm, dimensional color transitions
 */

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { KanbanPreview } from "@/components/landing/kanban-preview";
import { WikiPreview } from "@/components/landing/wiki-preview";
import { AIAssistantPreview } from "@/components/landing/ai-assistant-preview";
import { SelfOrganizingWork } from "@/components/landing/animation/self-organizing-work";
import { ArrowRight, CheckCircle } from "lucide-react";
import {
  systemLayers,
  featuresHeader,
  previewContent,
  stats,
  benefitsHeader,
  benefitsList,
  ctaContent,
  navLinks,
  footerContent,
} from "../landing-content";

export function VariantC() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200 overflow-hidden">
      {/* Animated gradient orbs - background atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      {/* Navigation - Floating glass style */}
      <nav className="relative z-50 px-6 lg:px-8 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-2xl px-6 py-4 shadow-xl shadow-slate-950/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Logo width={22} height={22} className="w-[22px] h-[22px]" variant="dark" />
                </div>
                <span className="text-lg font-semibold text-white">Loopwell</span>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                {navLinks.slice(0, 3).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="/login"
                  className="ml-2 px-5 py-2 text-sm bg-white/10 hover:bg-white/15 text-white rounded-lg transition-all duration-200 border border-white/10"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Layered depth */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
              Work should organize itself.
            </h1>
            <p className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight mb-10">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                And now it can.
              </span>
            </p>
            
            <p className="text-xl text-slate-400 leading-relaxed mb-12 max-w-2xl mx-auto">
              Loopwell is the first AI-native business operating system where context replaces project and team management overhead.
            </p>
            
            <Button 
              size="lg" 
              className="px-8 py-6 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Self-Organizing Work Animation */}
      <SelfOrganizingWork />

      {/* System Architecture - Layered depth */}
      <section id="features" className="relative py-24 px-6 lg:px-8">
        {/* Section background layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-slate-800/20 to-slate-900/0" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {featuresHeader.title}
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {featuresHeader.subtitle}
            </p>
          </div>
          
          {/* System layers stack */}
          <div className="space-y-1">
            {systemLayers.map((layer, _index) => (
              <div
                key={layer.id}
                className={layer.isSpanning
                  ? "relative -mx-6 lg:-mx-0 px-6 lg:px-8 py-8 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 border-l-2 border-blue-500/30"
                  : "relative px-6 lg:px-8 py-6 bg-slate-900/20 border-l border-slate-700/30"
                }
                style={{
                  boxShadow: layer.isSpanning ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
                }}
              >
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                    Layer {layer.number}
                  </span>
                  <h3 className="text-lg font-semibold text-white">
                    {layer.title}
                  </h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed ml-16">
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section - Layered panels */}
      <section id="preview" className="relative py-24 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {previewContent.title}
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {previewContent.subtitle}
            </p>
          </div>

          <div className="space-y-8">
            {[
              { id: "dashboard", label: "Dashboard Overview", component: <DashboardPreview />, gradient: "from-blue-600/10" },
              { id: "projects", label: "Project Management", component: <KanbanPreview />, gradient: "from-green-600/10" },
              { id: "wiki", label: "Spaces", component: <WikiPreview />, gradient: "from-purple-600/10" },
              { id: "ai", label: "LoopBrain", component: <AIAssistantPreview />, gradient: "from-indigo-600/10" },
            ].map((section) => (
              <div 
                key={section.id} 
                className={`relative bg-gradient-to-br ${section.gradient} to-transparent rounded-3xl p-1`}
              >
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-[22px] overflow-hidden border border-slate-700/30">
                  <div className="px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
                    <h3 className="text-sm font-medium text-white">{section.label}</h3>
                  </div>
                  <div className="p-6">
                    {section.component}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits - Dimensional cards */}
      <section id="benefits" className="relative py-24 px-6 lg:px-8">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-purple-900/10 to-slate-900/0" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {benefitsHeader.title}
            </h2>
            <p className="text-lg text-slate-400">
              {benefitsHeader.subtitle}
            </p>
          </div>
          
          {/* Stats - Floating glass cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((stat, _index) => (
              <div 
                key={stat.label} 
                className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 text-center border border-slate-700/30 hover:bg-slate-800/60 transition-colors"
              >
                <div className={`text-4xl font-bold mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Benefits list - Stacked panels */}
          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-green-500/50 via-green-500/20 to-transparent hidden md:block" />
            
            <div className="space-y-4">
              {benefitsList.map((benefit, _index) => (
                <div
                  key={benefit.title}
                  className="relative flex items-start gap-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 hover:translate-x-2 md:ml-6"
                >
                  {/* Connection dot */}
                  <div className="absolute -left-6 top-8 w-3 h-3 bg-green-500 rounded-full hidden md:block shadow-lg shadow-green-500/50" />
                  
                  <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">{benefit.title}</h4>
                    <p className="text-slate-400 text-sm">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Glowing panel */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 blur-3xl" />
            
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-12 border border-slate-700/40 text-center shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {ctaContent.title}
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                {ctaContent.subtitle}
              </p>
              <Button 
                size="lg" 
                className="px-10 py-6 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                {ctaContent.buttonText}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Soft layers */}
      <footer className="relative py-12 px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Logo width={20} height={20} className="w-5 h-5" variant="dark" />
              </div>
              <span className="text-lg font-semibold text-white">Loopwell</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              {footerContent.legal.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800/50 text-sm text-slate-500">
            {footerContent.copyright}
          </div>
        </div>
      </footer>

      {/* Custom CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </div>
  );
}

