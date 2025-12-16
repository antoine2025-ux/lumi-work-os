"use client";

import React from "react";

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCta,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="rounded-2xl border border-black/5 bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto max-w-md">
          <div className="text-lg font-semibold text-black/90 dark:text-white/90">{title}</div>
          <div className="mt-2 text-sm text-black/60 dark:text-white/60">{description}</div>
          <div className="mt-6">
            <button
              type="button"
              onClick={onCta}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

