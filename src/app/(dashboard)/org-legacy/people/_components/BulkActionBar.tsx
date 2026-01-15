"use client";

export function BulkActionBar({
  selectedCount,
  onResolve,
  onClear,
}: {
  selectedCount: number;
  onResolve: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-black/80">
      <div className="flex items-center gap-3 text-sm">
        <span>{selectedCount} selected</span>
        <button
          onClick={onResolve}
          className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
        >
          Resolve
        </button>
        <button
          onClick={onClear}
          className="rounded-xl px-3 py-2 text-xs text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

