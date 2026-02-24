"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Mail,
  Bell,
  CheckSquare,
  Folder,
  Sparkles,
  FileText,
  MessageSquare,
  Clock,
  Users,
  Zap,
  Send,
  Maximize2,
} from "lucide-react"
import { CalendarModal } from "./CalendarModal"
import { EmailModal } from "./EmailModal"
import Image from "next/image"

// ─── Widget shell ───────────────────────────────────────────────────────────

function Widget({
  icon: Icon,
  title,
  children,
  className = "",
  onExpand,
  hinted = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  className?: string
  onExpand?: () => void
  hinted?: boolean
}) {
  return (
    <div className={`group relative bg-landing-surface border border-landing-border rounded-lg p-3 flex flex-col gap-2.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-landing-text-muted" />
        <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">
          {title}
        </span>
        {onExpand && (
          <button
            onClick={onExpand}
            className={`ml-auto p-0.5 rounded hover:bg-landing-surface-elevated transition-all duration-200 ${
              hinted
                ? "opacity-100 ring-1 ring-landing-accent/40 animate-pulse"
                : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Expand ${title}`}
          >
            <Maximize2 className="w-3 h-3 text-landing-text-muted" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Calendar widget ─────────────────────────────────────────────────────────

function CalendarWidget({ onExpand, hinted }: { onExpand?: () => void; hinted?: boolean }) {
  const meetings = [
    { time: "9:00 AM", title: "Sprint Planning", attendees: 4, highlight: false },
    { time: "11:30 AM", title: "1:1 with Sarah", attendees: 2, highlight: false },
    { time: "2:00 PM", title: "Client call", attendees: 3, highlight: true },
  ]

  return (
    <Widget icon={Calendar} title="Calendar" onExpand={onExpand} hinted={hinted}>
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-xl font-semibold text-landing-text leading-none">23</span>
        <span className="text-xs text-landing-text-muted">Mon, Feb</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {meetings.map((m) => (
          <div
            key={m.title}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
              m.highlight
                ? "bg-landing-accent/10 border border-landing-accent/20"
                : "bg-landing-bg"
            }`}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-landing-text truncate">{m.title}</span>
              <span className="text-[10px] text-landing-text-muted">{m.time}</span>
            </div>
            <div className="flex items-center gap-0.5 ml-2 shrink-0">
              <Users className="w-3 h-3 text-landing-text-muted" />
              <span className="text-[10px] text-landing-text-muted">{m.attendees}</span>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Email widget ─────────────────────────────────────────────────────────────

function EmailWidget({ onExpand, hinted }: { onExpand?: () => void; hinted?: boolean }) {
  const emails = [
    { sender: "James Williams", subject: "RE: API documentation...", time: "2h ago", muted: false },
    { sender: "Sarah Mitchell", subject: "Research findings ready", time: "4h ago", muted: false },
    { sender: "Notion", subject: "Your weekly digest", time: "1d ago", muted: true },
  ]

  return (
    <Widget icon={Mail} title="Email" onExpand={onExpand} hinted={hinted}>
      <div className="flex flex-col gap-1.5">
        {emails.map((e) => (
          <div key={e.subject} className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-xs truncate ${e.muted ? "text-landing-text-muted" : "text-landing-text"}`}>
                {e.sender}
              </span>
              <span className="text-[10px] text-landing-text-muted truncate">{e.subject}</span>
            </div>
            <span className={`text-[10px] shrink-0 mt-0.5 ${e.muted ? "text-landing-text-muted/60" : "text-landing-text-muted"}`}>
              {e.time}
            </span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Notifications widget ─────────────────────────────────────────────────────

function NotificationsWidget() {
  const notifications = [
    {
      icon: "🧠",
      text: "Team capacity at 89%. Consider redistributing Q2 tasks.",
      isLoopbrain: true,
    },
    {
      icon: "✓",
      text: "Sprint 14 completed — 94% velocity",
      isLoopbrain: false,
    },
        {
          icon: "👤",
          text: "Sarah Mitchell added you to 'Mobile Redesign'",
          isLoopbrain: false,
        },
  ]

  return (
    <Widget icon={Bell} title="Notifications">
      <div className="flex flex-col gap-1.5">
        {notifications.map((n, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={`text-[11px] mt-0.5 shrink-0 ${
                n.isLoopbrain ? "text-landing-accent" : ""
              }`}
            >
              {n.icon}
            </span>
            <span className="text-[10px] text-landing-text-secondary leading-relaxed">{n.text}</span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Priority dot ─────────────────────────────────────────────────────────────

function PriorityDot({ level }: { level: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-red-400/70",
    medium: "bg-yellow-400/70",
    low: "bg-green-400/70",
  }
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${colors[level]}`} />
}

// ─── Todo widget ──────────────────────────────────────────────────────────────

function TodoWidget() {
  const tasks = [
    { label: "Review James's PR", priority: "high" as const, due: "Today", done: false },
    { label: "Finalize Q2 roadmap", priority: "medium" as const, due: "Tomorrow", done: false },
    { label: "Update investor deck", priority: "high" as const, due: "Wed", done: false },
    { label: "Book team offsite venue", priority: "low" as const, due: "This week", done: true },
  ]

  return (
    <Widget icon={CheckSquare} title="To-Do">
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div key={t.label} className="flex items-start gap-2">
            <div
              className={`w-3.5 h-3.5 rounded border shrink-0 mt-0.5 flex items-center justify-center ${
                t.done
                  ? "border-landing-accent bg-landing-accent/20"
                  : "border-landing-border"
              }`}
            >
              {t.done && (
                <svg className="w-2 h-2 text-landing-accent" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <PriorityDot level={t.priority} />
            <div className="flex-1 min-w-0">
              <span className={`text-xs block truncate ${t.done ? "line-through text-landing-text-muted" : "text-landing-text"}`}>
                {t.label}
              </span>
            </div>
            <span className="text-[10px] text-landing-text-muted shrink-0">{t.due}</span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Projects widget ──────────────────────────────────────────────────────────

function ProjectsWidget() {
  const projects = [
    { name: "Mobile App Redesign", progress: 68, status: "On track", statusColor: "text-green-400/80" },
    { name: "API v2 Migration", progress: 34, status: "At risk", statusColor: "text-yellow-400/80" },
    { name: "Q2 Planning", progress: 90, status: "On track", statusColor: "text-green-400/80" },
  ]

  return (
    <Widget icon={Folder} title="Projects">
      <div className="flex flex-col gap-3">
        {projects.map((p) => (
          <div key={p.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-landing-text truncate mr-2">{p.name}</span>
              <span className={`text-[10px] shrink-0 ${p.statusColor}`}>{p.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-landing-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-landing-accent"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-landing-text-muted shrink-0">{p.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Quick actions widget ─────────────────────────────────────────────────────

function QuickActionsWidget() {
  const actions = [
    { icon: CheckSquare, label: "Add task" },
    { icon: FileText, label: "New page" },
    { icon: Sparkles, label: "Ask Loopbrain", accent: true },
    { icon: Calendar, label: "Schedule" },
  ]

  return (
    <Widget icon={Zap} title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <div
            key={a.label}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-md py-2.5 px-2 border cursor-default select-none ${
              a.accent
                ? "bg-landing-accent/10 border-landing-accent/25"
                : "bg-landing-bg border-landing-border"
            }`}
          >
            <a.icon
              className={`w-3.5 h-3.5 ${a.accent ? "text-landing-accent" : "text-landing-text-secondary"}`}
            />
            <span className={`text-[10px] text-center ${a.accent ? "text-landing-accent" : "text-landing-text-muted"}`}>
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Loopbrain sidebar ────────────────────────────────────────────────────────

function LoopbrainAvatar() {
  return (
    <div className="w-5 h-5 rounded-full bg-landing-accent flex items-center justify-center shrink-0">
      <Image src="/white.png" alt="Loopwell" width={12} height={12} className="object-contain" />
    </div>
  )
}

function LoopbrainChat({ step }: { step: number }) {
  const taskVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <div className="w-full flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-landing-border shrink-0"
      >
        <LoopbrainAvatar />
        <span className="text-xs font-semibold text-landing-text">Loopbrain</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0" />
      </motion.div>

      {/* Chat */}
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
        {/* Loopbrain message 1 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={step >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed">
              I noticed 3 action items from your{" "}
              <span className="text-landing-text font-medium">Product Roadmap</span> meeting
              haven&apos;t been assigned yet. Want me to create tasks and assign them based on team capacity?
            </p>
          </div>
        </motion.div>

        {/* User message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={step >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex justify-end"
        >
          <motion.div
            animate={step >= 4 ? { scale: [1, 0.95, 1] } : {}}
            transition={{ duration: 0.2 }}
            className="bg-landing-accent/20 border border-landing-accent/20 rounded-lg rounded-tr-none px-2.5 py-2 max-w-[80%]"
          >
            <p className="text-[11px] text-landing-text font-medium">Yes, do it</p>
          </motion.div>
        </motion.div>

        {/* Loopbrain message 2 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={step >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-2.5 py-2 flex-1">
            <p className="text-[11px] text-landing-text-secondary leading-relaxed mb-2">
              Done. Created 3 tasks:
            </p>
            <motion.div
              initial="hidden"
              animate={step >= 6 ? "visible" : "hidden"}
              variants={{ visible: { transition: { staggerChildren: 0.15 } }, hidden: {} }}
              className="flex flex-col gap-1.5 mb-2"
            >
              <motion.div variants={taskVariants} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0" />
                <span className="text-[11px] text-landing-text">
                  API redesign{" "}
                  <span className="text-landing-text-muted">→ James Williams</span>
                  <span className="text-landing-text-muted/70"> (32% cap.)</span>
                </span>
              </motion.div>
              <motion.div variants={taskVariants} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0" />
                <span className="text-[11px] text-landing-text">
                  User research{" "}
                  <span className="text-landing-text-muted">→ Sarah Mitchell</span>
                  <span className="text-landing-text-muted/70"> (45% cap.)</span>
                </span>
              </motion.div>
              <motion.div variants={taskVariants} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-landing-accent shrink-0" />
                <span className="text-[11px] text-landing-text">
                  Prototype review{" "}
                  <span className="text-landing-text-muted">→ You</span>
                  <span className="text-landing-text-muted/70"> (next Tue.)</span>
                </span>
              </motion.div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={step >= 7 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] text-landing-text-muted"
            >
              Slack notifications sent. Anything else?
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={step >= 8 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="px-3 py-2.5 border-t border-landing-border shrink-0"
      >
        <div className="flex items-center gap-2 bg-landing-surface border border-landing-border rounded-lg px-2.5 py-1.5">
          <MessageSquare className="w-3 h-3 text-landing-text-muted shrink-0" />
          <span className="text-[11px] text-landing-text-muted flex-1">Ask Loopbrain...</span>
          <Send className="w-3 h-3 text-landing-text-muted/50 shrink-0" />
        </div>
      </motion.div>
    </div>
  )
}

// ─── Top bar (fake window chrome) ────────────────────────────────────────────

function WindowChrome({
  onSpacesClick,
  onOrgClick,
}: {
  onSpacesClick: () => void
  onOrgClick: () => void
}) {
  const navItems = [
    { label: "Dashboard", active: true, onClick: undefined as (() => void) | undefined },
    { label: "Spaces", active: false, onClick: onSpacesClick },
    { label: "Org", active: false, onClick: onOrgClick },
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
            onClick={item.onClick}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium select-none transition-colors ${
              item.active
                ? "bg-landing-surface text-landing-text cursor-default"
                : "text-landing-text-muted hover:text-landing-text-secondary cursor-pointer"
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

// ─── Main export ──────────────────────────────────────────────────────────────

const STEP_DELAYS = [300, 1000, 1000, 300, 300, 700, 300, 300]

export function HeroDashboardMockup() {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [hasHinted, setHasHinted] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [showLoopbrain, setShowLoopbrain] = useState(false)
  const [loopbrainStep, setLoopbrainStep] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setHasHinted(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Detect viewport entry once
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isInView) setIsInView(true) },
      { threshold: 0.3 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isInView])

  // Trigger sidebar after 2.5s in view
  useEffect(() => {
    if (!isInView) return
    const t = setTimeout(() => setShowLoopbrain(true), 2500)
    return () => clearTimeout(t)
  }, [isInView])

  // Step sequencer — cumulative timers
  useEffect(() => {
    if (!showLoopbrain) return
    const timers: ReturnType<typeof setTimeout>[] = []
    let acc = 0
    STEP_DELAYS.forEach((delay, i) => {
      acc += delay
      timers.push(setTimeout(() => setLoopbrainStep(i + 1), acc))
    })
    return () => timers.forEach(clearTimeout)
  }, [showLoopbrain])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

  return (
    <>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        className="w-full max-w-6xl mx-auto rounded-xl border border-landing-border overflow-hidden shadow-2xl shadow-black/20"
      >
        <WindowChrome
          onSpacesClick={() => scrollTo("spaces-section")}
          onOrgClick={() => scrollTo("org-section")}
        />

        <div className="flex min-h-0 overflow-hidden min-h-[280px] max-h-[70vh] md:max-h-[520px]">
          {/* Mobile: chat panel only */}
          <div className="md:hidden flex-1 flex flex-col bg-landing-surface-elevated overflow-hidden">
            <LoopbrainChat step={loopbrainStep} />
          </div>

          {/* Desktop: main content area — flex-1 shrinks naturally as sidebar expands */}
          <div className="hidden md:flex flex-1 bg-landing-bg p-3 flex-col gap-3 overflow-hidden min-w-0">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <CalendarWidget
                onExpand={() => setCalendarOpen(true)}
                hinted={!hasHinted}
              />
              <EmailWidget
                onExpand={() => setEmailOpen(true)}
                hinted={!hasHinted}
              />
              <NotificationsWidget />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <TodoWidget />
              <ProjectsWidget />
              <QuickActionsWidget />
            </div>
          </div>

          {/* Loopbrain sidebar — animates in from the right; hidden on mobile */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: showLoopbrain ? 250 : 0, opacity: showLoopbrain ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="hidden md:block shrink-0 bg-landing-surface-elevated border-l border-landing-border overflow-hidden"
          >
            <LoopbrainChat step={loopbrainStep} />
          </motion.div>
        </div>
      </motion.div>

      <CalendarModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <EmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  )
}
