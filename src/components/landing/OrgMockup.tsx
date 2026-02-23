"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Users,
  User,
  GitBranch,
  List,
  BarChart2,
  FolderOpen,
  Folder,
  MessageSquare,
  Send,
  Clock,
  Activity,
  Star,
  Calendar,
  Shield,
  BarChart3,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── View type ────────────────────────────────────────────────────────────────

type OrgView = "profile" | "engineering" | "product" | "design" | "marketing"

// ─── Window chrome ────────────────────────────────────────────────────────────

function WindowChrome() {
  const navItems = [
    { label: "Dashboard", active: false },
    { label: "Spaces", active: false },
    { label: "Org", active: true },
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

const TEAMS: { label: string; count: number }[] = [
  { label: "Engineering", count: 8 },
  { label: "Product", count: 5 },
  { label: "Design", count: 3 },
  { label: "Marketing", count: 4 },
]

interface OrgNavSidebarProps {
  activeView: OrgView
  onViewChange: (view: OrgView) => void
}

function OrgNavSidebar({ activeView, onViewChange }: OrgNavSidebarProps) {
  const views = [
    { label: "Org Chart", icon: GitBranch },
    { label: "Directory", icon: List },
    { label: "Capacity", icon: BarChart2 },
  ]

  return (
    <div className="hidden md:flex w-[180px] shrink-0 bg-landing-surface-elevated border-r border-landing-border flex-col py-3 gap-4 overflow-hidden">
      {/* My Profile */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          My Profile
        </p>
        <button
          onClick={() => onViewChange("profile")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-default select-none mx-0 rounded-md transition-colors",
            activeView === "profile"
              ? "bg-landing-accent/10 text-landing-text border-l-2 border-landing-accent pl-2.5"
              : "text-landing-text-secondary hover:bg-landing-surface"
          )}
        >
          <User
            className={cn(
              "w-3 h-3 shrink-0",
              activeView === "profile" ? "text-landing-accent" : "text-landing-text-muted"
            )}
          />
          <span className={activeView === "profile" ? "font-medium" : ""}>Your Profile</span>
        </button>
      </div>

      <div className="border-t border-landing-border/50" />

      {/* Teams */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          Teams
        </p>
        <div className="flex flex-col gap-0.5">
          {TEAMS.map((team) => {
            const isActive = activeView === team.label.toLowerCase()
            return (
              <button
                key={team.label}
                onClick={() => onViewChange(team.label.toLowerCase() as OrgView)}
                className={cn(
                  "w-full flex items-center gap-2 py-1.5 text-xs cursor-default select-none mx-1 rounded-md transition-colors",
                  isActive
                    ? "bg-landing-accent/10 text-landing-text border-l-2 border-landing-accent pl-2.5 pr-3"
                    : "px-3 text-landing-text-secondary hover:bg-landing-surface"
                )}
              >
                {isActive ? (
                  <FolderOpen className="w-3 h-3 text-landing-accent shrink-0" />
                ) : (
                  <Folder className="w-3 h-3 text-landing-text-muted shrink-0" />
                )}
                <span className={cn("flex-1 text-left", isActive && "font-medium")}>{team.label}</span>
                <span className={cn("text-[10px]", isActive ? "text-landing-accent/70" : "text-landing-text-muted")}>
                  {team.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-landing-border/50" />

      {/* Views */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium px-3 mb-1">
          Views
        </p>
        <div className="flex flex-col gap-0.5">
          {views.map((v) => (
            <div
              key={v.label}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-landing-text-secondary cursor-default select-none mx-1 rounded-md"
            >
              <v.icon className="w-3 h-3 text-landing-text-muted shrink-0" />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Org header ───────────────────────────────────────────────────────────────

function OrgHeader() {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-landing-accent" />
          <span className="text-sm font-semibold text-landing-text">Engineering</span>
        </div>
        <span className="text-[10px] text-landing-text-muted pl-5">
          8 team members • 78% average capacity
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {["Add Member", "Edit Team"].map((label) => (
          <div
            key={label}
            className="bg-landing-surface border border-landing-border rounded-md px-2 py-1 text-[10px] text-landing-text-secondary cursor-default select-none"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Capacity bar fill color ──────────────────────────────────────────────────

function capacityFill(pct: number): string {
  if (pct > 85) return "bg-red-400/80"
  if (pct > 70) return "bg-yellow-400/80"
  return "bg-green-400/80"
}

function capacityDot(pct: number): string {
  if (pct > 85) return "bg-red-400/80"
  if (pct > 70) return "bg-yellow-400/80"
  return "bg-green-400/80"
}

function capacityLabel(pct: number): string {
  if (pct > 85) return "Overloaded"
  if (pct > 70) return "Near limit"
  return "Available"
}

function capacityTextColor(pct: number): string {
  if (pct > 85) return "text-red-400/80"
  if (pct > 70) return "text-yellow-400/80"
  return "text-green-400/80"
}

// ─── Team member card ─────────────────────────────────────────────────────────

interface Member {
  initials: string
  avatarColor: string
  name: string
  role: string
  capacity: number
}

function TeamMemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-landing-surface border border-landing-border rounded-lg p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-full ${member.avatarColor} flex items-center justify-center shrink-0`}
        >
          <span className="text-[10px] font-semibold text-white">{member.initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-landing-text truncate">{member.name}</p>
          <p className="text-[10px] text-landing-text-muted truncate">{member.role}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-landing-text-muted">{member.capacity}% capacity</span>
        </div>
        <div className="h-1 rounded-full bg-landing-border overflow-hidden">
          <div
            className={`h-full rounded-full ${capacityFill(member.capacity)}`}
            style={{ width: `${member.capacity}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${capacityDot(member.capacity)}`} />
        <span className={`text-[10px] ${capacityTextColor(member.capacity)}`}>
          {capacityLabel(member.capacity)}
        </span>
      </div>
    </div>
  )
}

// ─── Team member grid ─────────────────────────────────────────────────────────

function TeamMemberGrid() {
  const members: Member[] = [
    { initials: "JW", avatarColor: "bg-blue-500/70",    name: "James Williams",    role: "Tech Lead",       capacity: 89 },
    { initials: "SM", avatarColor: "bg-purple-500/70",  name: "Sarah Mitchell",    role: "Senior Eng",      capacity: 45 },
    { initials: "AR", avatarColor: "bg-red-500/70",     name: "Alex Rivera",       role: "Senior Eng",      capacity: 92 },
    { initials: "PB", avatarColor: "bg-green-500/70",   name: "Philippe Bourbon",  role: "Designer",        capacity: 67 },
    { initials: "AM", avatarColor: "bg-orange-500/70",  name: "Aleksei Morlet",    role: "Engineer",        capacity: 72 },
    { initials: "AS", avatarColor: "bg-teal-500/70",    name: "Antoine Skvortsov", role: "Junior Eng",      capacity: 38 },
    { initials: "LW", avatarColor: "bg-pink-500/70",    name: "Leena Wong",        role: "Engineer",        capacity: 55 },
    { initials: "YO", avatarColor: "bg-landing-accent", name: "You",               role: "Eng Manager",     capacity: 81 },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2.5">
      {members.map((m) => (
        <TeamMemberCard key={m.name} member={m} />
      ))}
    </div>
  )
}

// ─── Team health bar ──────────────────────────────────────────────────────────

function TeamHealthBar() {
  return (
    <div className="bg-landing-surface border border-landing-border rounded-lg px-3 py-2 flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400/80 shrink-0" />
        <span className="text-[10px] text-landing-text-secondary">2 overloaded</span>
      </div>
      <span className="text-[10px] text-landing-border">·</span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/80 shrink-0" />
        <span className="text-[10px] text-landing-text-secondary">2 near limit</span>
      </div>
      <span className="text-[10px] text-landing-border">·</span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0" />
        <span className="text-[10px] text-landing-text-secondary">4 available</span>
      </div>
      <div className="w-px h-3 bg-landing-border mx-1" />
      <span className="text-[10px] text-landing-text-muted">Avg capacity: 78%</span>
      <span className="text-[10px] text-landing-text-muted ml-auto">3 projects active</span>
    </div>
  )
}

// ─── Profile view ─────────────────────────────────────────────────────────────

function ProfileView() {
  return (
    <div className="p-3 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-landing-accent flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-white">YO</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-landing-text">Your Name</h2>
            <p className="text-xs text-landing-text-secondary">Engineering Manager</p>
            <p className="text-[10px] text-landing-text-muted">Engineering · San Francisco</p>
          </div>
        </div>
        <div className="bg-landing-surface border border-landing-border rounded-md px-2 py-1 text-[10px] text-landing-text-secondary cursor-default select-none">
          Edit Profile
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-2">
          {/* Capacity */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                Current Capacity
              </h3>
              <span className="text-[10px] text-yellow-400/80 font-medium">Near limit</span>
            </div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-landing-text-secondary">81% utilized</span>
              <span className="text-landing-text-muted">32.4h / 40h</span>
            </div>
            <div className="h-1.5 bg-landing-border rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400/80 rounded-full" style={{ width: "81%" }} />
            </div>
          </div>

          {/* Active Projects */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <Folder className="w-3 h-3" />
              Active Projects
            </h3>
            <ul className="flex flex-col gap-1.5">
              {[
                { name: "Mobile App Redesign", role: "Owner" },
                { name: "API v2 Migration", role: "Contributor" },
                { name: "Q2 Planning", role: "Reviewer" },
              ].map((p) => (
                <li key={p.name} className="flex items-center justify-between text-[10px]">
                  <span className="text-landing-text truncate">{p.name}</span>
                  <span className="text-landing-text-muted shrink-0 ml-2">{p.role}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Skills */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <Star className="w-3 h-3" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-1">
              {["Eng Management", "System Design", "React", "TypeScript", "Team Leadership", "Agile"].map((skill) => (
                <span
                  key={skill}
                  className="px-1.5 py-0.5 text-[10px] bg-landing-surface-elevated rounded text-landing-text-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-2">
          {/* Time Off */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <Calendar className="w-3 h-3" />
              Time Off
            </h3>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-lg font-semibold text-landing-text leading-none">12 days</p>
                <p className="text-[10px] text-landing-text-muted">remaining this year</p>
              </div>
              <div className="bg-landing-accent text-white rounded-md px-2 py-1 text-[10px] cursor-default select-none">
                Request Leave
              </div>
            </div>
            <p className="text-[10px] text-landing-text-secondary">
              Next scheduled: <span className="text-landing-text">Mar 15–17</span>
            </p>
          </div>

          {/* Role & Responsibilities */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <Shield className="w-3 h-3" />
              Role &amp; Responsibilities
            </h3>
            <ul className="flex flex-col gap-1.5">
              {[
                "Lead engineering team of 7 engineers",
                "Approve technical architecture decisions",
                "Own sprint planning and delivery",
              ].map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-400/80 mt-0.5 shrink-0" />
                  <span className="text-[10px] text-landing-text-secondary">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reporting */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3" />
              Reporting
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/70 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-white">CTO</span>
              </div>
              <div>
                <p className="text-xs font-medium text-landing-text">Reports to CTO</p>
                <p className="text-[10px] text-landing-text-muted">7 direct reports</p>
              </div>
            </div>
          </div>

          {/* This Quarter */}
          <div className="p-2.5 rounded-lg border border-landing-border bg-landing-surface">
            <h3 className="text-[11px] font-medium text-landing-text flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3 h-3" />
              This Quarter
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { value: "24", label: "Tasks done" },
                { value: "3", label: "Shipped" },
                { value: "94%", label: "On-time" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-base font-semibold text-landing-text">{s.value}</p>
                  <p className="text-[9px] text-landing-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Loopbrain shared avatar ───────────────────────────────────────────────────

function LoopbrainAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-5 h-5" : "w-5 h-5"
  const imgDim = size === "sm" ? 10 : 12
  return (
    <div className={`${dim} rounded-full bg-landing-accent flex items-center justify-center shrink-0`}>
      <Image src="/white.png" alt="Loopwell" width={imgDim} height={imgDim} className="object-contain" />
    </div>
  )
}

// ─── Loopbrain sidebar — team view ────────────────────────────────────────────

function LoopbrainSidebar() {
  return (
    <div className="hidden md:flex w-[250px] shrink-0 bg-landing-surface-elevated border-l border-landing-border flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-landing-border">
        <LoopbrainAvatar />
        <span className="text-xs font-semibold text-landing-text">Loopbrain</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0" />
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
        {/* Loopbrain message 1 */}
        <div className="flex items-start gap-2">
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed">
              <span className="text-landing-text font-medium">Alex</span> is at 92% capacity with
              the API migration deadline in 2 weeks. I found that{" "}
              <span className="text-landing-text font-medium">Antoine</span> (38% capacity) has the
              right skills to take over the documentation tasks. Reassign 2 tasks to Antoine?
            </p>
          </div>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-landing-accent/20 border border-landing-accent/20 rounded-lg rounded-tr-none px-2.5 py-2 max-w-[80%]">
            <p className="text-[11px] text-landing-text font-medium">Reassign them</p>
          </div>
        </div>

        {/* Loopbrain message 2 */}
        <div className="flex items-start gap-2">
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed mb-2">Done:</p>
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  &apos;Write API changelog&apos;{" "}
                  <span className="text-landing-text-muted">→ Antoine</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  &apos;Update SDK examples&apos;{" "}
                  <span className="text-landing-text-muted">→ Antoine</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  Alex{" "}
                  <span className="text-landing-text-muted">
                    92%{" "}
                    <span className="text-landing-text-muted/60 line-through">→</span>
                  </span>{" "}
                  <span className="text-green-400/80">71%</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  Antoine{" "}
                  <span className="text-landing-text-muted">38%</span>{" "}
                  <span className="text-landing-text-muted">→</span>{" "}
                  <span className="text-yellow-400/80">58%</span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-landing-text-muted leading-relaxed">
              Both notified. I&apos;ll monitor the migration timeline.
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-landing-border">
        <div className="flex items-center gap-2 bg-landing-surface border border-landing-border rounded-lg px-2.5 py-1.5">
          <MessageSquare className="w-3 h-3 text-landing-text-muted shrink-0" />
          <span className="text-[11px] text-landing-text-muted flex-1">Ask Loopbrain...</span>
          <Send className="w-3 h-3 text-landing-text-muted/50 shrink-0" />
        </div>
      </div>
    </div>
  )
}

// ─── Loopbrain sidebar — profile view ────────────────────────────────────────

function ProfileLoopbrain() {
  return (
    <div className="hidden md:flex w-[250px] shrink-0 bg-landing-surface-elevated border-l border-landing-border flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-landing-border">
        <LoopbrainAvatar />
        <span className="text-xs font-semibold text-landing-text">Loopbrain</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0" />
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
        {/* Loopbrain message 1 */}
        <div className="flex items-start gap-2">
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed">
              You&apos;re at{" "}
              <span className="font-semibold text-yellow-400/80">81% capacity</span> with the Q2
              milestone due Friday. I can reschedule your 2 non-critical 1:1s to next week to free
              up 2 hours. Want me to?
            </p>
          </div>
        </div>

        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-landing-accent/20 border border-landing-accent/20 rounded-lg rounded-tr-none px-2.5 py-2 max-w-[80%]">
            <p className="text-[11px] text-landing-text font-medium">Yes, reschedule them</p>
          </div>
        </div>

        {/* Loopbrain message 2 */}
        <div className="flex items-start gap-2">
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed mb-2">Done:</p>
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  1:1 with Sarah{" "}
                  <span className="text-landing-text-muted">→ Monday 2pm</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  1:1 with Alex{" "}
                  <span className="text-landing-text-muted">→ Tuesday 10am</span>
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0 mt-1.5" />
                <span className="text-[11px] text-landing-text leading-relaxed">
                  Freed up:{" "}
                  <span className="text-green-400/80">Thursday 2–4pm</span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-landing-text-muted leading-relaxed">
              Both notified. Your capacity is now{" "}
              <span className="text-green-400/80 font-medium">73%</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-landing-border">
        <div className="flex items-center gap-2 bg-landing-surface border border-landing-border rounded-lg px-2.5 py-1.5">
          <MessageSquare className="w-3 h-3 text-landing-text-muted shrink-0" />
          <span className="text-[11px] text-landing-text-muted flex-1">Ask Loopbrain...</span>
          <Send className="w-3 h-3 text-landing-text-muted/50 shrink-0" />
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function OrgMockup() {
  const [activeView, setActiveView] = useState<OrgView>("engineering")

  const isProfile = activeView === "profile"

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
        <OrgNavSidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Main content */}
        <div className="flex-1 bg-landing-bg p-3 flex flex-col overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {isProfile ? (
                <ProfileView />
              ) : (
                <>
                  <OrgHeader />
                  <TeamMemberGrid />
                  <TeamHealthBar />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Loopbrain sidebar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isProfile ? "lb-profile" : "lb-team"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isProfile ? <ProfileLoopbrain /> : <LoopbrainSidebar />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
