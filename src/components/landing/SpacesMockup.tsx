"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Folder,
  FolderOpen,
  Globe,
  FileText,
  MessageSquare,
  Send,
  Clock,
  Plus,
  User,
  Target,
  FolderKanban,
  CheckSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type SpaceView = "personal" | "engineering" | "product" | "marketing" | "wiki" | "templates"

// ─── Window chrome ────────────────────────────────────────────────────────────

function WindowChrome() {
  const navItems = [
    { label: "Dashboard", active: false },
    { label: "Spaces", active: true },
    { label: "Org", active: false },
  ]

  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-landing-border bg-landing-surface-elevated shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
      <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
      <div className="flex-1 mx-4 flex items-center gap-1">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-default select-none ${
              item.active
                ? "bg-landing-surface text-landing-text"
                : "text-landing-text-muted"
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
      <Clock className="w-3 h-3 text-landing-text-muted" />
      <span className="text-[10px] text-landing-text-muted">9:04 AM</span>
    </div>
  )
}

// ─── Left nav sidebar ─────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 py-1.5 text-xs rounded-md mx-1 transition-colors",
        active
          ? "bg-landing-accent/10 border-l-2 border-landing-accent pl-2.5 pr-3 text-landing-text font-medium"
          : "px-3 text-landing-text-secondary hover:bg-landing-surface-elevated"
      )}
      style={{ width: "calc(100% - 8px)" }}
    >
      <Icon
        className={cn(
          "w-3 h-3 shrink-0",
          active ? "text-landing-accent" : "text-landing-text-muted"
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  )
}

function SpacesNavSidebar({
  activeSpace,
  onSelect,
}: {
  activeSpace: SpaceView
  onSelect: (v: SpaceView) => void
}) {
  return (
    <div className="hidden md:flex w-[180px] shrink-0 bg-landing-surface-elevated border-r border-landing-border flex-col py-3 gap-4 overflow-hidden">
      {/* My Space */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          My Space
        </p>
        <NavItem
          icon={User}
          label="Personal"
          active={activeSpace === "personal"}
          onClick={() => onSelect("personal")}
        />
      </div>

      <div className="border-t border-landing-border/50" />

      {/* Team Spaces */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          Team Spaces
        </p>
        <div className="flex flex-col gap-0.5">
          <NavItem
            icon={activeSpace === "engineering" ? FolderOpen : Folder}
            label="Engineering"
            active={activeSpace === "engineering"}
            onClick={() => onSelect("engineering")}
          />
          <NavItem
            icon={activeSpace === "product" ? FolderOpen : Folder}
            label="Product"
            active={activeSpace === "product"}
            onClick={() => onSelect("product")}
          />
          <NavItem
            icon={activeSpace === "marketing" ? FolderOpen : Folder}
            label="Marketing"
            active={activeSpace === "marketing"}
            onClick={() => onSelect("marketing")}
          />
        </div>
      </div>

      <div className="border-t border-landing-border/50" />

      {/* Shared */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          Shared
        </p>
        <div className="flex flex-col gap-0.5">
          <NavItem
            icon={Globe}
            label="Company Wiki"
            active={activeSpace === "wiki"}
            onClick={() => onSelect("wiki")}
          />
          <NavItem
            icon={FileText}
            label="Templates"
            active={activeSpace === "templates"}
            onClick={() => onSelect("templates")}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SpaceHeader({
  icon: Icon,
  title,
  breadcrumb,
  showActions = true,
  actionLabels = ["New Page", "New Project"],
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  breadcrumb: string
  showActions?: boolean
  actionLabels?: string[]
}) {
  return (
    <div className="flex items-center justify-between mb-3 shrink-0">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-landing-accent" />
          <span className="text-sm font-semibold text-landing-text">{title}</span>
        </div>
        <span className="text-[10px] text-landing-text-muted pl-5">{breadcrumb}</span>
      </div>
      {showActions && (
        <div className="flex items-center gap-1.5">
          {actionLabels.map((label) => (
            <div
              key={label}
              className="bg-landing-surface border border-landing-border rounded-md px-2 py-1 text-[10px] text-landing-text-secondary cursor-default select-none"
            >
              {label}
            </div>
          ))}
          <div className="bg-landing-surface border border-landing-border rounded-md px-2 py-1 text-[10px] text-landing-text-secondary cursor-default select-none flex items-center gap-1">
            <Plus className="w-2.5 h-2.5" />
            <span>Add</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectsSection({
  projects,
}: {
  projects: { name: string; tasks: number; progress: number; status: string; statusColor: string; updated: string }[]
}) {
  return (
    <div className="flex flex-col gap-2 mb-3 shrink-0">
      <div className="flex items-center gap-1.5">
        <Folder className="w-3 h-3 text-landing-text-muted" />
        <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">Projects</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {projects.map((p) => (
          <div
            key={p.name}
            className="bg-landing-surface border border-landing-border rounded-lg p-3 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-medium text-landing-text leading-tight">{p.name}</span>
              <span className={`text-[10px] shrink-0 ${p.statusColor}`}>{p.status}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-landing-text-muted">{p.tasks} tasks</span>
                <span className="text-[10px] text-landing-text-muted">{p.progress}%</span>
              </div>
              <div className="h-1 rounded-full bg-landing-border overflow-hidden">
                <div className="h-full rounded-full bg-landing-accent" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-landing-text-muted/70">Updated {p.updated}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PagesSection({
  pages,
}: {
  pages: { title: string; isFolder?: boolean; updatedBy?: string | null; time: string }[]
}) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center gap-1.5">
        <FileText className="w-3 h-3 text-landing-text-muted" />
        <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">Pages</span>
      </div>
      <div className="bg-landing-surface border border-landing-border rounded-lg overflow-hidden">
        {pages.map((page, i) => {
          const PageIcon = page.isFolder ? Folder : FileText
          return (
            <div
              key={page.title}
              className={`flex items-center gap-2.5 px-3 py-2 ${
                i < pages.length - 1 ? "border-b border-landing-border/40" : ""
              }`}
            >
              <PageIcon className="w-3.5 h-3.5 text-landing-text-muted shrink-0" />
              <span className="text-xs text-landing-text truncate flex-1">{page.title}</span>
              {page.updatedBy && (
                <>
                  <span className="text-[10px] text-landing-border">·</span>
                  <span className="text-[10px] text-landing-text-muted shrink-0">
                    Updated by {page.updatedBy}
                  </span>
                </>
              )}
              <span className="text-[10px] text-landing-text-muted/70 ml-auto shrink-0">{page.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── View: Personal ───────────────────────────────────────────────────────────

function PersonalContent() {
  const workingOn = [
    { name: "API v2 Migration", team: "Engineering", role: "3 tasks assigned", updated: "2h ago" },
    { name: "Q2 Planning Doc", team: "Product", role: "Editing", updated: "Today" },
    { name: "Mobile App Redesign", team: "Engineering", role: "Owner", updated: "Yesterday" },
  ]

  const myPages = [
    { title: "Architecture Decision Records", meta: "Draft · Updated today" },
    { title: "Sprint 15 Planning Notes", meta: "Published · 2 days ago" },
    { title: "1:1 Notes: Sarah Mitchell", meta: "Private · Yesterday" },
    { title: "Q2 Goals Review", meta: "Draft · 3 days ago" },
  ]

  const dueSoon = [
    { label: "Review James's PR", due: "Today", priority: "bg-red-400/70" },
    { label: "Finalize Q2 roadmap", due: "Tomorrow", priority: "bg-yellow-400/70" },
    { label: "Update investor deck", due: "Wednesday", priority: "bg-red-400/70" },
  ]

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <SpaceHeader
        icon={User}
        title="My Work"
        breadcrumb="Spaces / Personal"
        showActions={false}
      />

      {/* Currently working on */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderKanban className="w-3 h-3 text-landing-text-muted" />
          <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">Currently Working On</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {workingOn.map((w) => (
            <div key={w.name} className="bg-landing-surface border border-landing-border rounded-lg p-3 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-landing-text leading-tight">{w.name}</span>
              <span className="text-[10px] text-landing-accent">{w.team}</span>
              <span className="text-[10px] text-landing-text-muted">{w.role}</span>
              <span className="text-[10px] text-landing-text-muted/70 mt-0.5">Updated {w.updated}</span>
            </div>
          ))}
        </div>
      </div>

      {/* My Pages */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-landing-text-muted" />
          <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">My Pages</span>
        </div>
        <div className="bg-landing-surface border border-landing-border rounded-lg overflow-hidden">
          {myPages.map((page, i) => (
            <div
              key={page.title}
              className={`flex items-center gap-2.5 px-3 py-1.5 ${i < myPages.length - 1 ? "border-b border-landing-border/40" : ""}`}
            >
              <FileText className="w-3.5 h-3.5 text-landing-text-muted shrink-0" />
              <span className="text-xs text-landing-text truncate flex-1">{page.title}</span>
              <span className="text-[10px] text-landing-text-muted/70 ml-auto shrink-0">{page.meta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Due Soon */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-3 h-3 text-landing-text-muted" />
          <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">Due Soon</span>
        </div>
        <div className="bg-landing-surface border border-landing-border rounded-lg overflow-hidden">
          {dueSoon.map((task, i) => (
            <div
              key={task.label}
              className={`flex items-center gap-2.5 px-3 py-1.5 ${i < dueSoon.length - 1 ? "border-b border-landing-border/40" : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.priority}`} />
              <span className="text-xs text-landing-text truncate flex-1">{task.label}</span>
              <span className="text-[10px] text-landing-text-muted shrink-0">{task.due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── View: Engineering ────────────────────────────────────────────────────────

function EngineeringContent() {
  const projects = [
    { name: "Mobile App Redesign", tasks: 12, progress: 68, status: "On track", statusColor: "text-green-400/80", updated: "2h ago" },
    { name: "API v2 Migration", tasks: 8, progress: 34, status: "At risk", statusColor: "text-yellow-400/80", updated: "1d ago" },
    { name: "DevOps Pipeline", tasks: 5, progress: 90, status: "On track", statusColor: "text-green-400/80", updated: "3h ago" },
  ]

  const pages = [
    { title: "API Documentation", updatedBy: "James", time: "2 hours ago" },
    { title: "Sprint 14 Retro Notes", updatedBy: "Sarah", time: "Yesterday" },
    { title: "Architecture Decision Records", updatedBy: "You", time: "3 days ago" },
    { title: "Q2 Technical Roadmap", updatedBy: "James", time: "1 week ago" },
    { title: "Meeting Notes", isFolder: true, updatedBy: null, time: "12 pages" },
  ]

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <SpaceHeader icon={FolderOpen} title="Engineering" breadcrumb="Spaces / Engineering" />
      <ProjectsSection projects={projects} />
      <PagesSection pages={pages} />
    </div>
  )
}

// ─── View: Product ────────────────────────────────────────────────────────────

function ProductContent() {
  const projects = [
    { name: "Q2 Roadmap Planning", tasks: 8, progress: 72, status: "On track", statusColor: "text-green-400/80", updated: "1h ago" },
    { name: "User Research 2026", tasks: 5, progress: 45, status: "On track", statusColor: "text-green-400/80", updated: "3h ago" },
    { name: "Pricing Revamp", tasks: 12, progress: 28, status: "At risk", statusColor: "text-yellow-400/80", updated: "2d ago" },
  ]

  const pages = [
    { title: "PRD: Mobile Checkout", updatedBy: "Sarah", time: "1 hour ago" },
    { title: "Competitive Analysis Q2", updatedBy: "You", time: "Yesterday" },
    { title: "User Personas 2026", updatedBy: "Philippe", time: "3 days ago" },
    { title: "Pricing Strategy Doc", updatedBy: "Antoine", time: "1 week ago" },
    { title: "Meeting Notes", isFolder: true, updatedBy: null, time: "8 pages" },
  ]

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <SpaceHeader icon={Folder} title="Product" breadcrumb="Spaces / Product" />
      <ProjectsSection projects={projects} />
      <PagesSection pages={pages} />
    </div>
  )
}

// ─── View: Marketing ─────────────────────────────────────────────────────────

function MarketingContent() {
  const projects = [
    { name: "Brand Refresh", tasks: 6, progress: 90, status: "On track", statusColor: "text-green-400/80", updated: "2h ago" },
    { name: "Q2 Campaign", tasks: 15, progress: 55, status: "On track", statusColor: "text-green-400/80", updated: "30m ago" },
    { name: "Website Redesign", tasks: 9, progress: 80, status: "On track", statusColor: "text-green-400/80", updated: "1d ago" },
  ]

  const pages = [
    { title: "Brand Guidelines v2", updatedBy: "Lisa", time: "2 hours ago" },
    { title: "Q2 Campaign Brief", updatedBy: "Tom", time: "Today" },
    { title: "Social Media Calendar", updatedBy: "Lisa", time: "Yesterday" },
    { title: "Website Copy Draft", updatedBy: "You", time: "2 days ago" },
    { title: "Assets & Templates", isFolder: true, updatedBy: null, time: "24 pages" },
  ]

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <SpaceHeader icon={Folder} title="Marketing" breadcrumb="Spaces / Marketing" />
      <ProjectsSection projects={projects} />
      <PagesSection pages={pages} />
    </div>
  )
}

// ─── View: Wiki ───────────────────────────────────────────────────────────────

function WikiContent() {
  const tocItems = [
    { label: "Engineering Standards", active: true },
    { label: "Code Review Guidelines", active: false },
    { label: "API Documentation", active: false },
    { label: "Onboarding Guide", active: false },
    { label: "Security Policies", active: false },
    { label: "Benefits & Perks", active: false },
  ]

  return (
    <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 overflow-hidden">
      {/* TOC */}
      <div className="w-full md:w-[160px] shrink-0 flex flex-col gap-1 overflow-hidden">
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium mb-1">Company Wiki</p>
        {tocItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] cursor-default select-none",
              item.active
                ? "bg-landing-accent/10 text-landing-accent font-medium"
                : "text-landing-text-secondary"
            )}
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] cursor-default select-none text-landing-text-secondary">
          <Folder className="w-3 h-3 shrink-0" />
          <span className="truncate">Team Directories</span>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 bg-landing-surface border border-landing-border rounded-lg p-4 overflow-hidden min-w-0 flex flex-col gap-3">
        <div className="border-b border-landing-border pb-2">
          <h2 className="text-sm font-semibold text-landing-text">Engineering Standards</h2>
          <p className="text-[10px] text-landing-text-muted mt-0.5">
            Last updated by James Williams · 2 weeks ago
          </p>
        </div>

        <div className="flex flex-col gap-2.5 text-[11px] text-landing-text-secondary leading-relaxed overflow-hidden">
          <div>
            <p className="text-xs font-semibold text-landing-text mb-1">Overview</p>
            <p>These standards apply to all engineering work at the company.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-landing-text mb-1">Code Style</p>
            <p>All code must follow our ESLint and Prettier configuration. No exceptions without team lead approval.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-landing-text mb-1">Pull Requests</p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {["Every PR requires at least one approval", "PRs must pass CI before merge", "Use conventional commit messages"].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-landing-text-muted shrink-0 mt-1.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-landing-text mb-1">Testing Requirements</p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {["Minimum 80% coverage for new features", "E2E tests required for user-facing flows"].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-landing-text-muted shrink-0 mt-1.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View: Templates ──────────────────────────────────────────────────────────

function TemplatesContent() {
  const templates = [
    { name: "Project Brief", uses: 12 },
    { name: "PRD Template", uses: 28 },
    { name: "Meeting Notes", uses: 45 },
    { name: "Sprint Retro", uses: 18 },
    { name: "1:1 Agenda", uses: 32 },
    { name: "Decision Record", uses: 8 },
  ]

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <SpaceHeader
        icon={FileText}
        title="Templates"
        breadcrumb="Spaces / Templates"
        actionLabels={["Create Template"]}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-landing-text-muted" />
          <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">All Templates</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {templates.map((t) => (
            <div
              key={t.name}
              className="bg-landing-surface border border-landing-border rounded-lg p-3 flex flex-col gap-2 hover:border-landing-accent/30 transition-colors cursor-default"
            >
              <FileText className="w-4 h-4 text-landing-text-muted" />
              <span className="text-xs font-medium text-landing-text">{t.name}</span>
              <span className="text-[10px] text-landing-text-muted">{t.uses} uses</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Loopbrain conversations ──────────────────────────────────────────────────

function LoopbrainAvatar() {
  return (
    <div className="w-5 h-5 rounded-full bg-landing-accent flex items-center justify-center shrink-0">
      <Image src="/white.png" alt="Loopwell" width={12} height={12} className="object-contain" />
    </div>
  )
}

interface LBMessage {
  role: "ai" | "user"
  text: string
  bullets?: string[]
  footer?: string
}

function LoopbrainChat({ messages }: { messages: LBMessage[] }) {
  return (
    <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
      {messages.map((msg, i) => {
        if (msg.role === "user") {
          return (
            <div key={i} className="flex justify-end">
              <div className="bg-landing-accent/20 border border-landing-accent/20 rounded-lg rounded-tr-none px-2.5 py-2 max-w-[80%]">
                <p className="text-[11px] text-landing-text font-medium">{msg.text}</p>
              </div>
            </div>
          )
        }
        return (
          <div key={i} className="flex items-start gap-2">
            <LoopbrainAvatar />
            <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
              <p className="text-[11px] text-landing-text-secondary leading-relaxed">{msg.text}</p>
              {msg.bullets && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {msg.bullets.map((b, bi) => (
                    <div key={bi} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                      <span className="text-[11px] text-landing-text leading-relaxed">{b}</span>
                    </div>
                  ))}
                </div>
              )}
              {msg.footer && (
                <p className="text-[11px] text-landing-text-muted mt-2 leading-relaxed">{msg.footer}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const LOOPBRAIN_CONVERSATIONS: Record<SpaceView, LBMessage[]> = {
  personal: [
    {
      role: "ai",
      text: "You have 3 tasks due this week and 2 documents still in draft. Want me to block focus time on your calendar to finish them?",
    },
    { role: "user", text: "Yes, find 4 hours" },
    {
      role: "ai",
      text: "Done:",
      bullets: ["Blocked Tuesday 2–4pm", "Blocked Thursday 10am–12pm"],
      footer: "Both slots had no conflicts. I'll remind you 30 minutes before each block.",
    },
  ],
  engineering: [
    {
      role: "ai",
      text: "The 'API Documentation' page hasn't been updated since the v2 migration started. Want me to flag this for James and add a task to his sprint?",
    },
    { role: "user", text: "Yes, and CC Sarah" },
    {
      role: "ai",
      text: "Done:",
      bullets: [
        "Created task 'Update API docs for v2' → James",
        "Added to Sprint 15 (starts Monday)",
        "Sarah Mitchell notified via Slack",
      ],
      footer: "The page is now linked to the API v2 Migration project for tracking.",
    },
  ],
  product: [
    {
      role: "ai",
      text: "The Pricing Revamp project is at risk — 28% complete with 3 weeks left. I noticed 4 tasks are unassigned. Want me to suggest team members based on availability?",
    },
    { role: "user", text: "Show suggestions" },
    {
      role: "ai",
      text: "Based on capacity:",
      bullets: [
        "'Competitor pricing audit' → Philippe (38% cap.)",
        "'Update pricing page' → Aleksei (45% cap.)",
        "'A/B test setup' → Leena (52% cap.)",
        "'Analytics integration' → Alex (67% cap.)",
      ],
      footer: "Assign all four?",
    },
  ],
  marketing: [
    {
      role: "ai",
      text: "Q2 Campaign is 55% complete. I noticed the 'Social Media Calendar' page references the old brand colors. Should I flag this for Lisa and link it to the Brand Refresh project?",
    },
    { role: "user", text: "Yes, flag it" },
    {
      role: "ai",
      text: "Done:",
      bullets: [
        "Created task 'Update social calendar with new brand' → Lisa",
        "Linked page to Brand Refresh project",
        "Lisa notified via Slack",
      ],
      footer: "I'll track this until the Brand Refresh ships.",
    },
  ],
  wiki: [
    {
      role: "ai",
      text: "This page references 'Sprint 12 deadlines' but we're now on Sprint 15. It was last updated 2 weeks ago. Want me to flag this for review and notify James?",
    },
    { role: "user", text: "Flag for review" },
    {
      role: "ai",
      text: "Done:",
      bullets: [
        "Created task 'Review Engineering Standards page' → James",
        "Added label 'needs-update'",
        "James Williams notified via Slack",
      ],
      footer: "I'll check back in 1 week if not updated.",
    },
  ],
  templates: [
    {
      role: "ai",
      text: "The 'Meeting Notes' template is your most used (45 times). I noticed it doesn't include an action items section. Want me to draft an updated version?",
    },
    { role: "user", text: "Show draft" },
    {
      role: "ai",
      text: "Here's a suggested update. Added sections:",
      bullets: [
        "Action Items (with assignee + due date)",
        "Follow-up Required (checkbox list)",
        "Next Meeting Date",
      ],
      footer: "Preview it in Templates, or should I replace the current version?",
    },
  ],
}

function LoopbrainSidebar({ activeSpace }: { activeSpace: SpaceView }) {
  const messages = LOOPBRAIN_CONVERSATIONS[activeSpace]

  return (
    <div className="hidden md:flex w-[250px] shrink-0 bg-landing-surface-elevated border-l border-landing-border flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-landing-border shrink-0">
        <LoopbrainAvatar />
        <span className="text-xs font-semibold text-landing-text">Loopbrain</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0" />
      </div>

      {/* Chat — keyed so AnimatePresence re-mounts on space change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSpace}
          className="flex-1 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <LoopbrainChat messages={messages} />
        </motion.div>
      </AnimatePresence>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-landing-border shrink-0">
        <div className="flex items-center gap-2 bg-landing-surface border border-landing-border rounded-lg px-2.5 py-1.5">
          <MessageSquare className="w-3 h-3 text-landing-text-muted shrink-0" />
          <span className="text-[11px] text-landing-text-muted flex-1">Ask Loopbrain...</span>
          <Send className="w-3 h-3 text-landing-text-muted/50 shrink-0" />
        </div>
      </div>
    </div>
  )
}

// ─── Content renderer ─────────────────────────────────────────────────────────

function renderContent(view: SpaceView) {
  switch (view) {
    case "personal":    return <PersonalContent />
    case "engineering": return <EngineeringContent />
    case "product":     return <ProductContent />
    case "marketing":   return <MarketingContent />
    case "wiki":        return <WikiContent />
    case "templates":   return <TemplatesContent />
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SpacesMockup() {
  const [activeSpace, setActiveSpace] = useState<SpaceView>("engineering")

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      className="w-full max-w-6xl mx-auto rounded-xl border border-landing-border overflow-hidden shadow-2xl shadow-black/20"
    >
      <WindowChrome />

      <div className="flex min-h-0 overflow-hidden min-h-[280px] max-h-[70vh] md:max-h-[520px]">
        {/* Left nav sidebar */}
        <SpacesNavSidebar activeSpace={activeSpace} onSelect={setActiveSpace} />

        {/* Main content with transition */}
        <div className="flex-1 bg-landing-bg p-3 flex flex-col overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSpace}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent(activeSpace)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Loopbrain sidebar */}
        <LoopbrainSidebar activeSpace={activeSpace} />
      </div>
    </motion.div>
  )
}
