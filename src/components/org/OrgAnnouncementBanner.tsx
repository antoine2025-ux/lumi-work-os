"use client";

import { useState } from "react";

export function OrgAnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="w-full border-b border-blue-600/20 bg-blue-600/10 px-10 py-2 flex items-center justify-between text-[12px] text-blue-200">
      <span>
        Welcome to the new Org Center! Explore the redesigned structure, people, and insights tools.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-blue-300 transition-colors hover:text-blue-100 focus-ring rounded px-2 py-1"
        aria-label="Dismiss announcement"
      >
        Dismiss
      </button>
    </div>
  );
}

