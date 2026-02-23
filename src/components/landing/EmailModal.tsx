"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, X, Search, Pen, Reply, Forward, Archive } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
}

interface EmailItem {
  id: string
  sender: string
  initials: string
  avatarColor: string
  subject: string
  preview: string
  time: string
  unread: boolean
  body: string[]
  to: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EMAILS: EmailItem[] = [
  {
    id: "em1",
    sender: "James Williams",
    initials: "JW",
    avatarColor: "bg-blue-500/20 text-blue-400",
    subject: "Q2 Roadmap — feedback needed",
    preview: "Hey, I've finished the draft of the Q2 roadmap. Would love your thoughts before...",
    time: "9:14 AM",
    unread: true,
    to: "you@loopwell.com",
    body: [
      "Hey,",
      "I've finished the draft of the Q2 roadmap. Would love your thoughts before we present it to the wider team on Thursday.",
      "Key highlights: we're doubling down on Loopbrain accuracy improvements, shipping the new org chart view, and kicking off the integrations sprint.",
      "Let me know if you want to hop on a call to talk through it, or feel free to leave comments directly in the doc.",
    ],
  },
  {
    id: "em2",
    sender: "Sarah Mitchell",
    initials: "SM",
    avatarColor: "bg-purple-500/20 text-purple-400",
    subject: "Design Review — Thursday 3 PM",
    preview: "Just confirming the Design Review slot for Thursday at 3. I'll send out the Figma...",
    time: "8:52 AM",
    unread: true,
    to: "you@loopwell.com",
    body: [
      "Hi,",
      "Just confirming the Design Review slot for Thursday at 3 PM. I'll send out the Figma link and agenda 30 minutes before.",
      "We'll be covering the new dashboard layout, the onboarding flow revisions, and the updated component library.",
      "Please bring any outstanding design questions — would be great to get alignment in one session.",
    ],
  },
  {
    id: "em3",
    sender: "Linear",
    initials: "LN",
    avatarColor: "bg-landing-accent/20 text-landing-accent",
    subject: "5 issues assigned to you",
    preview: "You have been assigned 5 new issues across 3 projects in Loopwell workspace...",
    time: "8:30 AM",
    unread: false,
    to: "you@loopwell.com",
    body: [
      "You have been assigned 5 new issues across 3 projects in your Loopwell workspace.",
      "• [LW-482] Fix auth token refresh edge case",
      "• [LW-483] Update Loopbrain snapshot contract",
      "• [LW-490] Org chart — handle missing parent position",
      "• [LW-491] Wiki AI: wire extract_tasks executor",
      "• [LW-495] Add WORKSPACE_SCOPED_MODELS entries",
      "View all issues in Linear →",
    ],
  },
  {
    id: "em4",
    sender: "Notion",
    initials: "NT",
    avatarColor: "bg-zinc-500/20 text-zinc-400",
    subject: "Weekly digest — 12 updates",
    preview: "Here's a summary of activity in your Notion workspace this week...",
    time: "Yesterday",
    unread: false,
    to: "you@loopwell.com",
    body: [
      "Here's a summary of activity in your Notion workspace this week.",
      "12 pages were updated, 3 new databases were created, and 2 pages were shared with external collaborators.",
      "Top contributors this week: James Williams, Sarah Mitchell, Alex Rivera.",
    ],
  },
  {
    id: "em5",
    sender: "Alex Rivera",
    initials: "AR",
    avatarColor: "bg-green-500/20 text-green-400",
    subject: "Investor deck — slides 8–12",
    preview: "I've updated slides 8 through 12 based on the feedback from Monday's dry run. The...",
    time: "Yesterday",
    unread: false,
    to: "you@loopwell.com",
    body: [
      "I've updated slides 8 through 12 based on the feedback from Monday's dry run.",
      "The traction section now leads with MRR growth, and I've simplified the architecture diagram to just three layers.",
      "One thing I'm still not happy with — the 'Why Now' slide feels a bit thin. Open to suggestions.",
      "Slides are in the shared Drive folder. Let me know if you want to review async or jump on a call.",
    ],
  },
  {
    id: "em6",
    sender: "Calendar",
    initials: "CA",
    avatarColor: "bg-red-500/20 text-red-400",
    subject: "Reminder: Investor Call in 30 min",
    preview: "Your event 'Investor Call' starts at 9:00 AM. Join link: meet.google.com/...",
    time: "Yesterday",
    unread: false,
    to: "you@loopwell.com",
    body: [
      "Your event 'Investor Call' starts at 9:00 AM.",
      "Organizer: you@loopwell.com",
      "Join: meet.google.com/abc-def-ghi",
      "This is an automated reminder from Google Calendar.",
    ],
  },
]

const FOLDERS = [
  { label: "Inbox", count: 12 },
  { label: "Sent", count: 0 },
  { label: "Drafts", count: 2 },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailModal({ isOpen, onClose }: EmailModalProps) {
  const [selectedId, setSelectedId] = useState<string>("em1")
  const [activeFolder, setActiveFolder] = useState<string>("Inbox")

  const selectedEmail = EMAILS.find((e) => e.id === selectedId) ?? EMAILS[0]

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
        <motion.div
          key="email-overlay"
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
              <Mail className="w-4 h-4 text-landing-accent" />
              <span className="text-sm font-semibold text-landing-text">Email</span>

              {/* Search */}
              <div className="flex items-center gap-2 bg-landing-bg border border-landing-border rounded-lg px-3 py-1.5 ml-4 flex-1 max-w-xs">
                <Search className="w-3 h-3 text-landing-text-muted" />
                <span className="text-[11px] text-landing-text-muted">Search emails...</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-landing-accent text-white rounded-lg px-3 py-1.5 text-xs font-medium cursor-default select-none">
                  <Pen className="w-3.5 h-3.5" />
                  Compose
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-landing-surface-elevated transition-colors"
                >
                  <X className="w-4 h-4 text-landing-text-muted" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Email list */}
              <div className="w-[38%] border-r border-landing-border flex flex-col shrink-0">
                {/* Folder tabs */}
                <div className="flex items-center gap-0 border-b border-landing-border px-3 pt-2 shrink-0">
                  {FOLDERS.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setActiveFolder(f.label)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors ${
                        activeFolder === f.label
                          ? "border-landing-accent text-landing-text font-medium"
                          : "border-transparent text-landing-text-muted hover:text-landing-text-secondary"
                      }`}
                    >
                      {f.label}
                      {f.count > 0 && (
                        <span className="bg-landing-accent/20 text-landing-accent text-[10px] font-medium px-1.5 rounded-full">
                          {f.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Email rows */}
                <div className="overflow-y-auto flex-1">
                  {EMAILS.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedId(email.id)}
                      className={`flex gap-3 px-3 py-2.5 border-b border-landing-border/40 cursor-pointer transition-colors ${
                        selectedId === email.id
                          ? "bg-landing-accent/10"
                          : "hover:bg-landing-surface-elevated"
                      }`}
                    >
                      {/* Unread dot */}
                      <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                        {email.unread ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-landing-accent" />
                        ) : (
                          <div className="w-1.5 h-1.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              email.unread
                                ? "font-semibold text-landing-text"
                                : "text-landing-text-secondary"
                            }`}
                          >
                            {email.sender}
                          </span>
                          <span className="text-[10px] text-landing-text-muted shrink-0">
                            {email.time}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${email.unread ? "text-landing-text-secondary" : "text-landing-text-muted"}`}>
                          {email.subject}
                        </p>
                        <p className="text-[10px] text-landing-text-muted truncate mt-0.5">
                          {email.preview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email detail */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {selectedEmail && (
                  <>
                    {/* Email header */}
                    <div className="px-6 py-4 border-b border-landing-border shrink-0">
                      <h3 className="text-sm font-semibold text-landing-text mb-3">
                        {selectedEmail.subject}
                      </h3>
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${selectedEmail.avatarColor}`}>
                          {selectedEmail.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-landing-text">
                              {selectedEmail.sender}
                            </span>
                            <span className="text-[10px] text-landing-text-muted">{selectedEmail.time}</span>
                          </div>
                          <p className="text-[10px] text-landing-text-muted mt-0.5">
                            To: {selectedEmail.to}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 flex-1">
                      <div className="flex flex-col gap-3">
                        {selectedEmail.body.map((paragraph, i) => (
                          <p key={i} className="text-sm text-landing-text-secondary leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-6 py-3 border-t border-landing-border shrink-0 flex items-center gap-2">
                      {[
                        { icon: Reply, label: "Reply" },
                        { icon: Forward, label: "Forward" },
                        { icon: Archive, label: "Archive" },
                      ].map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-landing-border text-xs text-landing-text-secondary hover:text-landing-text hover:border-landing-accent/40 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
