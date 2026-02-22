"use client";

/**
 * Variant B: Organizational Blueprint (Structure-first)
 * 
 * Design principles:
 * - Subtle gridlines and thin dividers throughout
 * - System-diagram aesthetic using precise alignment
 * - Feature relationships visualized through layout (columns, connectors)
 * - Monospace or technical typography accents
 * - Neutral palette with subtle blue structural elements
 * - Clear visual hierarchy through spacing and lines
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

export function VariantB() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Grid background pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148, 163, 184) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148, 163, 184) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Navigation - Technical, structured */}
      <nav className="relative border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-slate-600 flex items-center justify-center">
                <Logo width={20} height={20} className="w-5 h-5" variant="dark" />
              </div>
              <span className="text-sm font-mono tracking-widest text-white uppercase">Loopwell</span>
            </div>
            <div className="hidden md:flex items-center">
              {navLinks.slice(0, 3).map((link, _index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-5 py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors uppercase tracking-wider border-l border-slate-700/50 first:border-l-0"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/login"
                className="ml-6 px-4 py-2 text-xs font-mono border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors uppercase tracking-wider"
              >
                Access
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Blueprint style */}
      <section className="relative py-24 px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Left side - Labels */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-4 text-xs font-mono text-slate-600 uppercase tracking-wider">
                <div className="border-l-2 border-blue-500 pl-3">Hero</div>
                <div className="pl-3 opacity-50">01.00</div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="lg:col-span-8">
              <div className="border-l border-slate-700/50 pl-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight tracking-tight mb-4">
                  Work should organize itself.
                </h1>
                <p className="text-3xl md:text-4xl lg:text-5xl font-light text-blue-400 leading-tight tracking-tight mb-10">
                  And now it can.
                </p>
                
                <p className="text-lg text-slate-400 leading-relaxed mb-12 max-w-2xl">
                  Loopwell is the first AI-native business operating system where context replaces project and team management overhead.
                </p>
                
                <Button 
                  size="lg" 
                  className="px-8 py-5 text-sm font-mono uppercase tracking-wider bg-blue-600 hover:bg-blue-500"
                >
                  Get Started
                  <ArrowRight className="ml-3 w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Right side - Decorative */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="h-full border-l border-slate-800/50" />
            </div>
          </div>
        </div>
      </section>

      {/* Self-Organizing Work Animation */}
      <SelfOrganizingWork />

      {/* System Architecture - Blueprint stack */}
      <section id="features" className="relative py-24 px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-4 text-xs font-mono text-slate-600 uppercase tracking-wider">
                <div className="border-l-2 border-blue-500 pl-3">Architecture</div>
                <div className="pl-3 opacity-50">02.00</div>
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <div className="border-l border-slate-700/50 pl-8">
                <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
                  {featuresHeader.title}
                </h2>
                <p className="text-slate-400 leading-relaxed max-w-2xl mb-12">
                  {featuresHeader.subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* System layers stack */}
          <div className="lg:col-span-8 lg:col-start-3 space-y-px">
            {systemLayers.map((layer, index) => (
              <div
                key={layer.id}
                className={layer.isSpanning 
                  ? "relative -mx-6 lg:-mx-0 border-l-2 border-blue-500/40 bg-slate-900/10 pl-8 pr-6 lg:pr-8 py-6" 
                  : "border-l border-slate-700/50 bg-slate-950 pl-8 pr-6 lg:pr-8 py-6"
                }
              >
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">
                    {String(layer.number).padStart(2, '0')}.00
                  </span>
                  <h3 className="text-base font-medium text-white">
                    {layer.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed ml-12">
                  {layer.description}
                </p>
                {index < systemLayers.length - 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-800/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section - Technical layout */}
      <section id="preview" className="relative py-24 px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-4 text-xs font-mono text-slate-600 uppercase tracking-wider">
                <div className="border-l-2 border-blue-500 pl-3">Preview</div>
                <div className="pl-3 opacity-50">03.00</div>
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <div className="border-l border-slate-700/50 pl-8">
                <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
                  {previewContent.title}
                </h2>
                <p className="text-slate-400 leading-relaxed max-w-2xl">
                  {previewContent.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-16">
            {[
              { id: "dashboard", label: "Dashboard Overview", component: <DashboardPreview /> },
              { id: "projects", label: "Project Management", component: <KanbanPreview /> },
              { id: "wiki", label: "Spaces", component: <WikiPreview /> },
              { id: "ai", label: "LoopBrain", component: <AIAssistantPreview /> },
            ].map((section, index) => (
              <div key={section.id} className="border border-slate-800/50 bg-slate-900/20">
                <div className="border-b border-slate-800/50 px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-mono text-slate-400 uppercase tracking-wider">
                    {section.label}
                  </span>
                  <span className="text-xs font-mono text-slate-600">
                    03.{String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="p-6">
                  {section.component}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits - Structured data */}
      <section id="benefits" className="relative py-24 px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-4 text-xs font-mono text-slate-600 uppercase tracking-wider">
                <div className="border-l-2 border-blue-500 pl-3">Metrics</div>
                <div className="pl-3 opacity-50">04.00</div>
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <div className="border-l border-slate-700/50 pl-8">
                <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
                  {benefitsHeader.title}
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  {benefitsHeader.subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/30 mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-slate-950 p-8 text-center">
                <div className={`text-4xl font-light mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          
          {/* Benefits list with connectors */}
          <div className="border border-slate-800/50">
            {benefitsList.map((benefit, index) => (
              <div
                key={benefit.title}
                className="flex items-start gap-6 p-6 border-b border-slate-800/50 last:border-b-0"
              >
                <div className="flex-shrink-0 w-10 h-10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">{benefit.title}</h4>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
                <div className="flex-shrink-0 text-xs font-mono text-slate-700 ml-auto">
                  04.{String(index + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Blueprint style */}
      <section className="relative py-24 px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="border border-slate-700/50 p-12">
            <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-6">
              05.00 — Initialize
            </div>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
              {ctaContent.title}
            </h2>
            <p className="text-slate-400 mb-8">
              {ctaContent.subtitle}
            </p>
            <Button 
              size="lg" 
              className="px-10 py-5 text-sm font-mono uppercase tracking-wider bg-blue-600 hover:bg-blue-500"
            >
              {ctaContent.buttonText}
              <ArrowRight className="ml-3 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Technical style */}
      <footer className="relative py-12 px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border border-slate-700 flex items-center justify-center">
                <Logo width={16} height={16} className="w-4 h-4" variant="dark" />
              </div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loopwell</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs font-mono text-slate-500 uppercase tracking-wider">
              {footerContent.legal.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800/30 text-xs font-mono text-slate-600">
            {footerContent.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
}

