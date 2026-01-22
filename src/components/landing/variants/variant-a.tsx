"use client";

/**
 * Variant A: Calm Intelligence (Typography-first)
 * 
 * Design principles:
 * - No feature card grid - features as flowing prose blocks
 * - Large, editorial typography with distinct font weights/sizes
 * - Maximum whitespace, generous padding
 * - Minimal borders/shadows
 * - Single-column or asymmetric layouts
 * - Muted color palette with one accent
 */

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { KanbanPreview } from "@/components/landing/kanban-preview";
import { WikiPreview } from "@/components/landing/wiki-preview";
import { AIAssistantPreview } from "@/components/landing/ai-assistant-preview";
import { SelfOrganizingWork } from "@/components/landing/animation/self-organizing-work";
import { ArrowRight } from "lucide-react";
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

export function VariantA() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navigation - Ultra minimal */}
      <nav className="border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Logo width={28} height={28} className="w-7 h-7" variant="dark" />
              <span className="text-lg font-light tracking-wide text-white">Loopwell</span>
            </div>
            <div className="hidden md:flex items-center space-x-10">
              {navLinks.slice(0, 3).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-400 hover:text-white transition-colors font-light tracking-wide"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/login"
                className="text-sm text-slate-400 hover:text-white transition-colors font-light tracking-wide"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Editorial, single column */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extralight text-white leading-[1.1] tracking-tight mb-6">
            Work should organize itself.
          </h1>
          <p className="text-4xl md:text-5xl lg:text-6xl font-light text-blue-400 leading-[1.1] tracking-tight mb-12">
            And now it can.
          </p>
          
          <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed mb-16 max-w-2xl">
            Loopwell is the first AI-native business operating system where context replaces project and team management overhead.
          </p>
          
          <Button 
            size="lg" 
            className="px-10 py-6 text-base font-light tracking-wide bg-white text-slate-900 hover:bg-slate-100"
          >
            Get Started
            <ArrowRight className="ml-3 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Self-Organizing Work Animation */}
      <SelfOrganizingWork />

      {/* System Architecture - Layered stack */}
      <section id="features" className="py-32 px-6 lg:px-8 border-t border-slate-800/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-6 tracking-tight">
            {featuresHeader.title}
          </h2>
          <p className="text-lg text-slate-400 font-light leading-relaxed mb-20">
            {featuresHeader.subtitle}
          </p>
          
          <div className="space-y-16">
            {systemLayers.map((layer) => (
              <div
                key={layer.id}
                className={layer.isSpanning ? "relative -mx-6 lg:-mx-8 px-6 lg:px-8 py-8 bg-slate-900/20 border-l-2 border-blue-500/30" : "border-l border-slate-800/30 pl-8"}
              >
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-xs text-slate-600 font-mono">Layer {layer.number}</span>
                  <h3 className="text-xl font-normal text-white tracking-tight">
                    {layer.title}
                  </h3>
                </div>
                <p className="text-slate-400 font-light leading-relaxed">
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section - Clean, minimal */}
      <section id="preview" className="py-32 px-6 lg:px-8 border-t border-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-20">
            <h2 className="text-3xl md:text-4xl font-extralight text-white mb-6 tracking-tight">
              {previewContent.title}
            </h2>
            <p className="text-lg text-slate-400 font-light leading-relaxed">
              {previewContent.subtitle}
            </p>
          </div>

          <div className="space-y-24">
            <div>
              <span className="text-xs text-slate-600 font-mono block mb-6">Dashboard</span>
              <DashboardPreview />
            </div>
            <div>
              <span className="text-xs text-slate-600 font-mono block mb-6">Projects</span>
              <KanbanPreview />
            </div>
            <div>
              <span className="text-xs text-slate-600 font-mono block mb-6">Knowledge</span>
              <WikiPreview />
            </div>
            <div>
              <span className="text-xs text-slate-600 font-mono block mb-6">Intelligence</span>
              <AIAssistantPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits - Minimal stats */}
      <section id="benefits" className="py-32 px-6 lg:px-8 border-t border-slate-800/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-6 tracking-tight">
            {benefitsHeader.title}
          </h2>
          <p className="text-lg text-slate-400 font-light leading-relaxed mb-20">
            {benefitsHeader.subtitle}
          </p>
          
          {/* Stats as simple text */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className={`text-3xl font-extralight mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 font-light">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Benefits as simple list */}
          <div className="space-y-10">
            {benefitsList.map((benefit, index) => (
              <div key={benefit.title} className="flex items-start gap-6">
                <span className="text-xs text-slate-600 font-mono mt-1">0{index + 1}</span>
                <div>
                  <h4 className="font-normal text-white mb-2">{benefit.title}</h4>
                  <p className="text-slate-400 font-light leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Simple and clean */}
      <section className="py-32 px-6 lg:px-8 border-t border-slate-800/30 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-6 tracking-tight">
            {ctaContent.title}
          </h2>
          <p className="text-lg text-slate-400 font-light mb-10">
            {ctaContent.subtitle}
          </p>
          <Button 
            size="lg" 
            className="px-10 py-6 text-base font-light tracking-wide bg-white text-slate-900 hover:bg-slate-100"
          >
            {ctaContent.buttonText}
            <ArrowRight className="ml-3 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer - Ultra minimal */}
      <footer className="py-16 px-6 lg:px-8 border-t border-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center space-x-3">
              <Logo width={24} height={24} className="w-6 h-6" variant="dark" />
              <span className="text-sm font-light text-slate-400">Loopwell</span>
            </div>
            <div className="flex flex-wrap gap-8 text-sm text-slate-500 font-light">
              {footerContent.legal.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-12 text-xs text-slate-600 font-light">
            {footerContent.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
}

