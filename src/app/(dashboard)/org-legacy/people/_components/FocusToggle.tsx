"use client";

import React from "react";
import type { FocusMode } from "./focus";
import { focusCopy } from "./focus";

export function FocusToggle({
  mode,
  setMode,
}: {
  mode: FocusMode;
  setMode: (m: FocusMode) => void;
}) {
  return (
    <div className="flex rounded-xl border border-black/10 bg-white/60 p-1 dark:border-white/10 dark:bg-white/5">
      {(["explore", "fix"] as FocusMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          title={focusCopy[m].description}
          className={[
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            mode === m
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10",
          ].join(" ")}
        >
          {focusCopy[m].label}
        </button>
      ))}
    </div>
  );
}

