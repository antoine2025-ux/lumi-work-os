"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, MessageSquare } from "lucide-react"
import Image from "next/image"

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_MESSAGE = "Set up Q2 mobile redesign based on yesterday's roadmap meeting"

// step 0 → typewriter (2s)
// step 1 → thinking (1.5s)
// step 2 → plan card reveals (3s)
// step 3 → approve buttons + auto-click (0.8s)
// step 4 → execution checklist (3.2s)
// step 5 → completion message (2.5s)
// step 6 → hold + fade-out, reset (2s)
const TIMINGS = [2000, 1500, 3000, 800, 3200, 2500, 2000]

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LoopbrainMockupProps {
  className?: string
  autoPlay?: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoopbrainAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-7 h-7" : "w-5 h-5"
  const logoSize = size === "md" ? 14 : 12
  return (
    <div className={`${dim} rounded-full bg-landing-accent flex items-center justify-center shrink-0`}>
      <Image src="/white.png" alt="Loopwell" width={logoSize} height={logoSize} className="object-contain" />
    </div>
  )
}

// ─── Typewriter ───────────────────────────────────────────────────────────────

function TypewriterMessage({ step }: { step: number }) {
  const [displayed, setDisplayed] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (step !== 0) {
      setDisplayed(USER_MESSAGE)
      return
    }
    setDisplayed("")
    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      setDisplayed(USER_MESSAGE.slice(0, i))
      if (i >= USER_MESSAGE.length && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, 35)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [step])

  return (
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-landing-accent/20 border border-landing-accent/20 rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]"
      >
        <p className="text-sm text-landing-text leading-relaxed">
          {displayed}
          {step === 0 && displayed.length < USER_MESSAGE.length && (
            <span className="inline-block w-0.5 h-3.5 bg-landing-accent ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      </motion.div>
    </div>
  )
}

// ─── Thinking bubble ──────────────────────────────────────────────────────────

function ThinkingBubble({ visible }: { visible: boolean }) {
  const [label, setLabel] = useState("Analyzing meeting notes…")

  useEffect(() => {
    if (!visible) { setLabel("Analyzing meeting notes…"); return }
    const t = setTimeout(() => setLabel("Building execution plan…"), 750)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="thinking"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-3 py-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-landing-accent"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-landing-text-muted">{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function CapacityBar({ from, to, animate: shouldAnimate }: { from: number; to: number; animate: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="w-16 h-1 rounded-full bg-landing-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-landing-accent"
          initial={{ width: `${from}%` }}
          animate={{ width: shouldAnimate ? `${to}%` : `${from}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-landing-text-muted">
        {from}%
        {shouldAnimate && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-landing-accent"
          >
            {" "}→ {to}%
          </motion.span>
        )}
      </span>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

const planLineVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}

const planContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

function PlanCard({ visible }: { visible: boolean }) {
  const taskGroups = [
    { label: "User Research", count: 3 },
    { label: "Design System", count: 5 },
    { label: "iOS Implementation", count: 8 },
    { label: "Android Implementation", count: 6 },
  ]

  const team = [
    { name: "Sarah Mitchell", role: "Design", from: 45, to: 68 },
    { name: "James Williams", role: "iOS", from: 32, to: 71 },
    { name: "Alex", role: "Android", from: 67, to: 89, warn: true },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="plan"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <motion.div
            variants={planContainerVariants}
            initial="hidden"
            animate="visible"
            className="bg-landing-surface-elevated border border-landing-border rounded-lg rounded-tl-none p-3 flex-1 flex flex-col gap-2.5"
          >
            {/* Header */}
            <motion.div variants={planLineVariants}>
              <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium mb-1">
                Execution Plan
              </p>
              <p className="text-xs font-semibold text-landing-text">PROJECT: "Q2 Mobile Redesign"</p>
            </motion.div>

            {/* Task groups */}
            <motion.div variants={planLineVariants} className="flex flex-col gap-1">
              {taskGroups.map((g) => (
                <div key={g.label} className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-landing-text-muted">├──</span>
                  <span className="text-landing-text-secondary">{g.label}</span>
                  <span className="text-landing-text-muted">({g.count} tasks)</span>
                </div>
              ))}
            </motion.div>

            {/* Team */}
            <motion.div variants={planLineVariants}>
              <p className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium mb-1.5">
                Team Assignments
              </p>
              <div className="flex flex-col gap-2">
                {team.map((m) => (
                  <div key={m.name} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-landing-text">{m.name}</span>
                        <span className="text-[10px] text-landing-text-muted">({m.role})</span>
                        {m.warn && (
                          <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            className="text-[11px]"
                          >
                            ⚠️
                          </motion.span>
                        )}
                      </div>
                      <CapacityBar from={m.from} to={m.to} animate={visible} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Timeline + auto-created */}
            <motion.div variants={planLineVariants} className="flex flex-col gap-1 pt-1 border-t border-landing-border/50">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-landing-text-muted">TIMELINE:</span>
                <span className="text-landing-text">8 weeks</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-[10px] text-landing-text-muted">Also scheduled:</span>
              </div>
              {["Project wiki with brief", "Kickoff meeting (Tue 2pm)", "Slack notifications"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-[11px] text-landing-text-secondary pl-1">
                  <span className="w-1 h-1 rounded-full bg-landing-accent/60 shrink-0" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Approve buttons ──────────────────────────────────────────────────────────

function ApproveButtons({ visible, clicked }: { visible: boolean; clicked: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="approve"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 justify-end"
        >
          <div className="border border-landing-border text-landing-text-secondary rounded-lg px-3 py-1.5 text-xs cursor-default select-none">
            Modify
          </div>
          <motion.div
            animate={clicked ? { scale: [1, 0.94, 1] } : {}}
            transition={{ duration: 0.2 }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-default select-none transition-colors ${
              clicked
                ? "bg-landing-accent/80 text-white"
                : "bg-landing-accent text-white"
            }`}
          >
            {clicked ? "✓ Executing…" : "Approve & Execute"}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Execution checklist ──────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  "Project created",
  "22 tasks generated",
  "Team assigned",
  "Wiki page created",
  "Kickoff scheduled (Tue 2pm)",
  "Slack notifications sent",
]

function ChecklistItem({ label, index, active }: { label: string; index: number; active: boolean }) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!active) { setChecked(false); return }
    const t = setTimeout(() => setChecked(true), index * 400 + 200)
    return () => clearTimeout(t)
  }, [active, index])

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: active ? 1 : 0, x: active ? 0 : -8 }}
      transition={{ duration: 0.25, delay: active ? index * 0.08 : 0 }}
      className="flex items-center gap-2.5"
    >
      {/* Circle + checkmark */}
      <div className="relative w-4 h-4 shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full border border-landing-border"
          animate={{ opacity: checked ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-green-400/80 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.6 }}
          transition={{ duration: 0.2 }}
        >
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none">
            <motion.path
              d="M2 5.5L4 7.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: checked ? 1 : 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      </div>
      <span className={`text-xs transition-colors duration-300 ${checked ? "text-landing-text" : "text-landing-text-muted"}`}>
        {label}
      </span>
    </motion.div>
  )
}

function ExecutionChecklist({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="checklist"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-3 py-3 flex-1 flex flex-col gap-2">
            <p className="text-xs text-landing-text-secondary mb-1">Executing…</p>
            {CHECKLIST_ITEMS.map((item, i) => (
              <ChecklistItem key={item} label={item} index={i} active={visible} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Completion message ───────────────────────────────────────────────────────

function CompletionMessage({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="completion"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-2"
        >
          <LoopbrainAvatar />
          <div className="bg-landing-surface border border-landing-border rounded-lg rounded-tl-none px-3 py-2.5 flex-1">
            <p className="text-sm text-landing-text-secondary leading-relaxed">
              <span className="text-landing-text font-medium">Q2 Mobile Redesign</span> is live.
              I&apos;ll monitor progress and flag any blockers.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Window chrome ────────────────────────────────────────────────────────────

function WindowChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-landing-border bg-landing-surface-elevated shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
      <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
      <div className="flex items-center gap-2 ml-4">
        <LoopbrainAvatar size="sm" />
        <span className="text-xs font-semibold text-landing-text">Loopbrain</span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LoopbrainMockup({ className = "", autoPlay = true }: LoopbrainMockupProps) {
  const [step, setStep] = useState(0)
  const [bodyOpacity, setBodyOpacity] = useState(1)

  // Step-advance state machine
  useEffect(() => {
    if (!autoPlay) return
    const t = setTimeout(() => {
      if (step === 6) {
        // Fade out, then reset
        setBodyOpacity(0)
        setTimeout(() => {
          setStep(0)
          setBodyOpacity(1)
        }, 600)
      } else {
        setStep((s) => s + 1)
      }
    }, TIMINGS[step])
    return () => clearTimeout(t)
  }, [step, autoPlay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      className={`w-full max-w-6xl mx-auto rounded-xl border border-landing-border overflow-hidden shadow-2xl shadow-black/20 ${className}`}
      style={
        step >= 5
          ? { boxShadow: "0 0 0 1px rgba(245,158,11,0.15), 0 0 32px rgba(245,158,11,0.07), 0 25px 50px -12px rgba(0,0,0,0.2)" }
          : undefined
      }
    >
      <WindowChrome />

      {/* Chat body — fixed height so the container never resizes */}
      <div
        className="bg-landing-bg px-4 py-4 flex flex-col gap-4 transition-opacity duration-500 overflow-hidden"
        style={{ height: 560, opacity: bodyOpacity }}
      >
        {/* User message — always visible once step >= 0 */}
        <TypewriterMessage step={step} />

        {/* Thinking */}
        <ThinkingBubble visible={step === 1} />

        {/* Plan card */}
        <PlanCard visible={step >= 2 && step <= 3} />

        {/* Approve buttons */}
        <ApproveButtons visible={step === 3 || step === 4} clicked={step >= 4} />

        {/* Execution checklist */}
        <ExecutionChecklist visible={step >= 4 && step <= 5} />

        {/* Completion */}
        <CompletionMessage visible={step >= 5} />

        {/* Spacer + input field always at bottom */}
        <div className="mt-auto pt-2 border-t border-landing-border">
          <div className="flex items-center gap-2 bg-landing-surface border border-landing-border rounded-lg px-3 py-2">
            <MessageSquare className="w-3.5 h-3.5 text-landing-text-muted shrink-0" />
            <span className="text-xs text-landing-text-muted flex-1">Ask Loopbrain…</span>
            <Send className="w-3 h-3 text-landing-text-muted/50 shrink-0" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
