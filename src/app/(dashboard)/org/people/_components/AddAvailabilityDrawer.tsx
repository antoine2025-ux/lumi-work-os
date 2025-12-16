"use client";

import React, { useState } from "react";

export function AddAvailabilityDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (window: {
    type: "UNAVAILABLE" | "PARTIAL";
    startDate: Date;
    endDate?: Date;
    fraction?: number;
    note?: string;
  }) => void;
}) {
  const [type, setType] = useState<"UNAVAILABLE" | "PARTIAL">("UNAVAILABLE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fraction, setFraction] = useState(0.5);
  const [note, setNote] = useState("");

  if (!open) return null;

  const handleSave = () => {
    if (!startDate) {
      alert("Start date is required");
      return;
    }

    onSave({
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      fraction: type === "PARTIAL" ? fraction : undefined,
      note: note.trim() || undefined,
    });
    onClose();
    
    // Reset form
    setType("UNAVAILABLE");
    setStartDate("");
    setEndDate("");
    setFraction(0.5);
    setNote("");
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white/80 p-6 backdrop-blur dark:bg-black/80">
        <div className="mb-4">
          <div className="text-sm font-semibold">Add availability</div>
          <div className="text-xs text-black/50 dark:text-white/50">
            Record time-based availability. Org will not infer anything.
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "UNAVAILABLE" | "PARTIAL")}
              className="w-full rounded-lg border px-2 py-1 text-xs"
            >
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="PARTIAL">Partial availability</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border px-2 py-1 text-xs"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-black/50 dark:text-white/50">
              End date <span className="text-black/40 dark:text-white/40">(optional)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border px-2 py-1 text-xs"
            />
          </div>

          {type === "PARTIAL" && (
            <div>
              <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Fraction (0.0–1.0)</label>
              <input
                type="number"
                min={0.1}
                max={1}
                step={0.1}
                value={fraction}
                onChange={(e) => setFraction(Number(e.target.value))}
                className="w-full rounded-lg border px-2 py-1 text-xs"
                placeholder="e.g. 0.5"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-black/50 dark:text-white/50">
              Note <span className="text-black/40 dark:text-white/40">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border px-2 py-1 text-xs"
              placeholder="e.g. Vacation, Parental leave"
              rows={2}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs text-black/50 dark:text-white/50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-black px-3 py-2 text-xs text-white dark:bg-white dark:text-black"
          >
            Save
          </button>
        </div>
      </aside>
    </div>
  );
}

