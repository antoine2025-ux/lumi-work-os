"use client";

import { useState } from "react";

type HelpTipProps = {
  text: string;
  className?: string;
};

export function HelpTip({ text, className }: HelpTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-block ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="ml-1 h-4 w-4 rounded-full border border-slate-600 bg-slate-800/50 text-[10px] text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-colors"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-700 bg-[#020617] p-3 text-[11px] text-slate-300 shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}

