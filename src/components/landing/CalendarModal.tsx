"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, X, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CalendarEvent {
  id: string
  title: string
  dayCol: number  // 0 = Mon 24, 1 = Tue 25, ... 6 = Sun 2
  startHour: number // e.g. 9.0 = 9:00 AM, 11.5 = 11:30 AM
  durationH: number // in hours
  attendees: number
  colorClass: string // bg + border classes
  textClass: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Mon", date: 24 },
  { label: "Tue", date: 25 },
  { label: "Wed", date: 26 },
  { label: "Thu", date: 27 },
  { label: "Fri", date: 28 },
  { label: "Sat", date: 1 },
  { label: "Sun", date: 2 },
]

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

const EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    title: "Sprint Planning",
    dayCol: 1,
    startHour: 9,
    durationH: 1,
    attendees: 5,
    colorClass: "bg-blue-500/10 border-l-2 border-blue-400/70",
    textClass: "text-blue-400",
  },
  {
    id: "e2",
    title: "Client Call",
    dayCol: 1,
    startHour: 14,
    durationH: 0.5,
    attendees: 3,
    colorClass: "bg-landing-accent/10 border-l-2 border-landing-accent/70",
    textClass: "text-landing-accent",
  },
  {
    id: "e3",
    title: "1:1 with Sarah Mitchell",
    dayCol: 2,
    startHour: 11.5,
    durationH: 0.5,
    attendees: 2,
    colorClass: "bg-green-500/10 border-l-2 border-green-400/70",
    textClass: "text-green-400",
  },
  {
    id: "e4",
    title: "Design Review",
    dayCol: 2,
    startHour: 15,
    durationH: 1,
    attendees: 4,
    colorClass: "bg-purple-500/10 border-l-2 border-purple-400/70",
    textClass: "text-purple-400",
  },
  {
    id: "e5",
    title: "Team Standup",
    dayCol: 3,
    startHour: 10,
    durationH: 1,
    attendees: 8,
    colorClass: "bg-blue-500/10 border-l-2 border-blue-400/70",
    textClass: "text-blue-400",
  },
  {
    id: "e6",
    title: "Investor Call",
    dayCol: 4,
    startHour: 9,
    durationH: 0.5,
    attendees: 2,
    colorClass: "bg-landing-accent/10 border-l-2 border-landing-accent/70",
    textClass: "text-landing-accent",
  },
  {
    id: "e7",
    title: "Q2 Planning",
    dayCol: 4,
    startHour: 13,
    durationH: 1,
    attendees: 6,
    colorClass: "bg-purple-500/10 border-l-2 border-purple-400/70",
    textClass: "text-purple-400",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHour(h: number) {
  if (h === 12) return "12 PM"
  if (h > 12) return `${h - 12} PM`
  return `${h} AM`
}

function formatEventTime(startHour: number, durationH: number) {
  const endHour = startHour + durationH
  const fmtTime = (h: number) => {
    const mins = (h % 1) * 60
    const hr = Math.floor(h)
    const suffix = hr >= 12 ? "PM" : "AM"
    const hr12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr
    return mins > 0 ? `${hr12}:${String(mins).padStart(2, "0")} ${suffix}` : `${hr12} ${suffix}`
  }
  return `${fmtTime(startHour)} – ${fmtTime(endHour)}`
}

// ─── Grid constants ───────────────────────────────────────────────────────────
const ROW_HEIGHT_PX = 52  // px per hour
const GRID_START_HOUR = 8

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        // Overlay
        <motion.div
          key="cal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-4xl bg-landing-surface border border-landing-border rounded-2xl overflow-hidden shadow-2xl shadow-black/30 flex flex-col"
            style={{ maxHeight: "85vh" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-landing-border bg-landing-surface-elevated shrink-0">
              <Calendar className="w-4 h-4 text-landing-accent" />
              <span className="text-sm font-semibold text-landing-text">Calendar</span>

              {/* Month nav */}
              <div className="flex items-center gap-1 ml-4">
                <button className="p-1 rounded hover:bg-landing-border/40 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-landing-text-muted" />
                </button>
                <span className="text-xs text-landing-text-secondary px-1">February 2026</span>
                <button className="p-1 rounded hover:bg-landing-border/40 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-landing-text-muted" />
                </button>
              </div>

              {/* View toggles */}
              <div className="flex items-center border border-landing-border rounded-md overflow-hidden ml-2">
                {["Day", "Week", "Month"].map((v) => (
                  <div
                    key={v}
                    className={`px-2.5 py-1 text-[11px] cursor-default select-none ${
                      v === "Week"
                        ? "bg-landing-accent text-white"
                        : "text-landing-text-muted hover:text-landing-text"
                    }`}
                  >
                    {v}
                  </div>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-landing-accent text-white rounded-lg px-3 py-1.5 text-xs font-medium cursor-default select-none">
                  <Plus className="w-3.5 h-3.5" />
                  Create Event
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-landing-surface-elevated transition-colors"
                >
                  <X className="w-4 h-4 text-landing-text-muted" />
                </button>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="flex-1 overflow-auto">
              {/* Day column headers */}
              <div className="grid grid-cols-8 border-b border-landing-border sticky top-0 bg-landing-surface z-10">
                <div className="py-2" /> {/* time gutter */}
                {DAYS.map((d, i) => (
                  <div key={i} className="py-2 text-center border-l border-landing-border/40">
                    <span className="text-[10px] text-landing-text-muted uppercase tracking-wide">{d.label}</span>
                    <div
                      className={`text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${
                        i === 1 ? "bg-landing-accent text-white" : "text-landing-text"
                      }`}
                    >
                      {d.date}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time rows + events */}
              <div className="grid grid-cols-8 relative">
                {/* Time labels */}
                <div className="flex flex-col">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="flex items-start justify-end pr-2 text-[10px] text-landing-text-muted/60"
                      style={{ height: ROW_HEIGHT_PX }}
                    >
                      {formatHour(h)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="relative border-l border-landing-border/40"
                    style={{ height: ROW_HEIGHT_PX * HOURS.length }}
                  >
                    {/* Hour grid lines */}
                    {HOURS.map((_, rowIdx) => (
                      <div
                        key={rowIdx}
                        className="border-b border-landing-border/20"
                        style={{ height: ROW_HEIGHT_PX }}
                      />
                    ))}

                    {/* Events for this day */}
                    {EVENTS.filter((e) => e.dayCol === dayIdx).map((evt) => {
                      const topPx = (evt.startHour - GRID_START_HOUR) * ROW_HEIGHT_PX
                      const heightPx = evt.durationH * ROW_HEIGHT_PX - 3
                      return (
                        <div
                          key={evt.id}
                          className={`absolute left-1 right-1 rounded px-1.5 py-1 overflow-hidden ${evt.colorClass}`}
                          style={{ top: topPx + 2, height: heightPx }}
                        >
                          <p className={`text-[11px] font-medium leading-tight truncate ${evt.textClass}`}>
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-landing-text-muted leading-tight">
                            {formatEventTime(evt.startHour, evt.durationH)}
                          </p>
                          {heightPx > 36 && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <Users className="w-2.5 h-2.5 text-landing-text-muted" />
                              <span className="text-[10px] text-landing-text-muted">{evt.attendees}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 border-t border-landing-border bg-landing-surface-elevated shrink-0">
              <span className="text-[10px] text-landing-text-muted">Synced with Google Calendar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
