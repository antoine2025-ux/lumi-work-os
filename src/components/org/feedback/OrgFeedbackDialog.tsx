"use client";

import { useState } from "react";
import { trackOrgEvent } from "@/lib/org/track.client";

export function OrgFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    setSending(true);
    try {
      await trackOrgEvent({
        type: "ORG_CENTER_FEEDBACK",
        category: "org_center_feedback",
        name: "inline_feedback",
        route: window.location.pathname,
        meta: { text: value.trim() },
      });
      setSent(true);
      setValue("");
      // Auto-close after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 2000);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring rounded-full border border-slate-800 px-3 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
        aria-label="Give feedback about Org Center"
      >
        Give feedback
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Org Center feedback"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#020617] p-5 text-[13px] text-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-slate-50">
              Share feedback about Org Center
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Tell us what works well and what&apos;s confusing. This goes directly to the team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
            aria-label="Close feedback dialog"
          >
            Close
          </button>
        </div>

        {sent && (
          <div className="mb-3 rounded-lg border border-green-500/40 bg-green-950/40 px-3 py-2 text-[11px] text-green-100">
            Thank you for your feedback!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={4}
            className="focus-ring w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100 outline-none transition-colors"
            placeholder="What's working? What's confusing? What's missing?"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Feedback text"
          />
          <button
            type="submit"
            disabled={sending || !value.trim()}
            className="focus-ring rounded-full bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}

