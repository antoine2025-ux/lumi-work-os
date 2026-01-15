import React from "react";

export function ErrorNotice({
  title,
  message,
  onDismiss,
}: {
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-rose-300/60 bg-rose-50/60 p-4 shadow-sm dark:border-rose-400/30 dark:bg-rose-400/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            {title}
          </div>
          {message ? (
            <div className="mt-1 text-sm text-black/70 dark:text-white/70">
              {message}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

