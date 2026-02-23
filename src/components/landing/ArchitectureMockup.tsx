"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FolderKanban,
  Users,
  FileText,
  Target,
  Sparkles,
  Activity,
  AlertTriangle,
  GitBranch,
  ListChecks,
  UserPlus,
  Calendar,
  Bell,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ArchitectureMockupProps {
  className?: string
  autoPlay?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

// phase 0 → Data layer builds        (2s)
// phase 1 → Loopbrain layer builds   (2.5s)
// phase 2 → Action layer builds      (2.5s)
// phase 3 → Loop pulse travels       (3s)
// phase 4 → Tagline holds            (2s)
// phase 5 → Fade out + reset         (2s)
const TIMINGS = [2000, 2500, 2500, 3000, 2000, 2000]

// ─── Stagger variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

// ─── SVG Connector ────────────────────────────────────────────────────────────

function Connector({ visible }: { visible: boolean }) {
  return (
    <div className="flex items-center justify-center py-1 relative">
      <svg width="24" height="36" viewBox="0 0 24 36" fill="none" className="overflow-visible">
        {/* Dashed line */}
        <motion.line
          x1="12" y1="0" x2="12" y2="36"
          stroke="var(--landing-border, #2a2a2e)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Up arrow */}
        <motion.path
          d="M8 10 L12 4 L16 10"
          stroke="var(--landing-border, #2a2a2e)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 0.6 : 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        />
        {/* Down arrow */}
        <motion.path
          d="M8 26 L12 32 L16 26"
          stroke="var(--landing-border, #2a2a2e)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 0.6 : 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
      </svg>
    </div>
  )
}

// ─── Data layer ───────────────────────────────────────────────────────────────

function LayerData({ phase }: { phase: number }) {
  const visible = phase >= 0
  const items = [
    { icon: FolderKanban, label: "Projects" },
    { icon: Users, label: "People" },
    { icon: FileText, label: "Docs" },
    { icon: Target, label: "Goals" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.97 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-landing-surface border border-landing-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">
          Your Data
        </span>
        <span className="text-[10px] text-landing-text-muted">Layer 1</span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={visible ? "visible" : "hidden"}
        className="grid grid-cols-4 gap-4 mb-4"
      >
        {items.map(({ icon: Icon, label }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-landing-bg border border-landing-border flex items-center justify-center">
              <Icon className="w-5 h-5 text-landing-text-secondary" />
            </div>
            <span className="text-xs text-landing-text-secondary">{label}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="text-xs text-landing-text-muted text-center"
      >
        Structured. Connected. Always current.
      </motion.p>
    </motion.div>
  )
}

// ─── Loopbrain layer ──────────────────────────────────────────────────────────

function LayerLoopbrain({ phase }: { phase: number }) {
  const visible = phase >= 1
  const items = [
    { icon: Activity, label: "Monitors capacity" },
    { icon: AlertTriangle, label: "Detects risks" },
    { icon: GitBranch, label: "Finds connections" },
    { icon: ListChecks, label: "Builds plans" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative bg-landing-surface-elevated border border-landing-accent/30 rounded-xl p-6 overflow-hidden"
    >
      {/* Left accent bar */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: visible ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="absolute left-0 top-4 bottom-4 w-1 bg-landing-accent rounded-full origin-top"
      />

      <div className="flex items-center justify-between mb-4 pl-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-landing-accent" />
          <span className="text-[10px] uppercase tracking-widest font-semibold text-landing-accent">
            Loopbrain
          </span>
        </div>
        <span className="text-[10px] text-landing-text-muted">Layer 2 — Intelligence</span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={visible ? "visible" : "hidden"}
        className="grid grid-cols-4 gap-4 pl-3"
      >
        {items.map(({ icon: Icon, label }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-landing-accent/10 border border-landing-accent/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-landing-accent" />
            </div>
            <span className="text-xs text-landing-text-secondary text-center leading-tight">{label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ─── Action layer ─────────────────────────────────────────────────────────────

function LayerAction({ phase }: { phase: number }) {
  const visible = phase >= 2
  const items = [
    { icon: Sparkles, label: "Create" },
    { icon: UserPlus, label: "Assign" },
    { icon: Calendar, label: "Schedule" },
    { icon: Bell, label: "Notify" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-landing-accent/10 border border-landing-accent/20 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-landing-text-muted font-medium">
          Autonomous Action
        </span>
        <span className="text-[10px] text-landing-text-muted">Layer 3</span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={visible ? "visible" : "hidden"}
        className="grid grid-cols-4 gap-4 mb-4"
      >
        {items.map(({ icon: Icon, label }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-landing-accent/20 border border-landing-accent/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-landing-accent" />
            </div>
            <span className="text-xs text-landing-accent">{label}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="text-xs text-landing-text-muted text-center"
      >
        Human approved. AI executed.
      </motion.p>
    </motion.div>
  )
}

// ─── Loop pulse ───────────────────────────────────────────────────────────────

// The pulse travels over the full stack height.
// We use fixed pixel offsets calibrated to the known layout:
//   - 3 layers × ~120px each + 2 connectors × ~44px ≈ 448px total
//   - Pulse starts at bottom of stack, climbs to top, returns down
const PULSE_BOTTOM = 440
const PULSE_MID = 220
const PULSE_TOP = 0

function LoopPulse({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="pulse"
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style={{ top: 0 }}
          initial={{ opacity: 0 }}
          exit={{ opacity: 0 }}
        >
          {/* Glowing dot */}
          <motion.div
            className="w-3 h-3 rounded-full bg-landing-accent"
            style={{
              filter: "drop-shadow(0 0 6px rgba(245,158,11,0.9))",
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
            animate={{
              y: [PULSE_BOTTOM, PULSE_MID, PULSE_TOP, PULSE_MID, PULSE_BOTTOM],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: 2.8,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />
          {/* "Actions update data" label — appears at the bottom of the downward leg */}
          <motion.span
            className="absolute text-[10px] text-landing-accent font-medium whitespace-nowrap"
            style={{ left: "calc(50% + 16px)", top: PULSE_BOTTOM - 8 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 0.8, 0] }}
            transition={{ duration: 2.8, times: [0, 0.55, 0.7, 0.85, 1] }}
          >
            Actions update data
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ArchitectureMockup({ className = "", autoPlay = true }: ArchitectureMockupProps) {
  const [phase, setPhase] = useState(0)
  const [wrapperOpacity, setWrapperOpacity] = useState(1)

  useEffect(() => {
    if (!autoPlay) return
    const t = setTimeout(() => {
      if (phase === 5) {
        setWrapperOpacity(0)
        setTimeout(() => {
          setPhase(0)
          setWrapperOpacity(1)
        }, 600)
      } else {
        setPhase((p) => p + 1)
      }
    }, TIMINGS[phase])
    return () => clearTimeout(t)
  }, [phase, autoPlay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      className={`w-full max-w-[800px] mx-auto transition-opacity duration-500 ${className}`}
      style={{ opacity: wrapperOpacity }}
    >
      {/* Stack: Data on top, Loopbrain middle, Action on bottom */}
      <div className="relative flex flex-col gap-0">
        {/* Layer 1 — Data (top) */}
        <LayerData phase={phase} />

        {/* Connector: Data ↕ Loopbrain */}
        <Connector visible={phase >= 1} />

        {/* Layer 2 — Loopbrain (middle) */}
        <LayerLoopbrain phase={phase} />

        {/* Connector: Loopbrain ↕ Action */}
        <Connector visible={phase >= 2} />

        {/* Layer 3 — Action (bottom) */}
        <LayerAction phase={phase} />

        {/* Loop pulse overlay */}
        <LoopPulse active={phase === 3} />
      </div>

      {/* Tagline */}
      <motion.p
        animate={{
          opacity: phase >= 4 ? 1 : 0,
          y: phase >= 4 ? 0 : 8,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center text-xl font-medium text-landing-text mt-10"
      >
        The operating system that runs itself.
      </motion.p>
    </motion.div>
  )
}
