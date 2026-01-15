import React from "react";

export function FixQueueToggle({
  enabled,
  count,
  onToggle,
}: {
  enabled: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
        enabled
          ? "bg-amber-400/20 text-black ring-amber-400/30 dark:text-white"
          : "border border-black/10 text-black/70 hover:bg-black/5 hover:text-black ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10",
      ].join(" ")}
      title="Toggle Fix queue mode"
    >
      <span>Fix queue</span>
      <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs text-black/70 dark:bg-white/10 dark:text-white/70">
        {count}
      </span>
    </button>
  );
}

