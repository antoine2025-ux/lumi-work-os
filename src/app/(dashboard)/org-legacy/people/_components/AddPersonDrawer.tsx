"use client";

import React, { useState } from "react";

type Step = "identity" | "placement" | "review";

export function AddPersonDrawer({
  open,
  onClose,
  onCreate,
  peopleOptions,
  teamOptions,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  peopleOptions: { id: string; name: string }[];
  teamOptions: { id: string; name: string }[];
}) {
  const [step, setStep] = useState<Step>("identity");
  const [data, setData] = useState<any>({});

  if (!open) return null;

  const handleClose = () => {
    setStep("identity");
    setData({});
    onClose();
  };

  const handleCreate = () => {
    onCreate(data);
    setStep("identity");
    setData({});
    onClose();
  };

  const managerName = data.managerId
    ? peopleOptions.find((p) => p.id === data.managerId)?.name
    : null;
  const teamName = data.teamId
    ? teamOptions.find((t) => t.id === data.teamId)?.name
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className="absolute inset-0 bg-black/30 pointer-events-auto"
          onClick={handleClose}
        />
        <aside className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-black/80">
          <header className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                Add person to organization
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Place a new node in your org structure. Missing data can be filled later.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
            >
              Close
            </button>
          </header>

          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-2">
            {(["identity", "placement", "review"] as Step[]).map((s, idx) => (
              <React.Fragment key={s}>
                <div
                  className={[
                    "h-1.5 rounded-full transition-colors",
                    step === s || (step === "review" && idx < 3)
                      ? "w-8 bg-black dark:bg-white"
                      : "w-1.5 bg-black/20 dark:bg-white/20",
                  ].join(" ")}
                />
                {idx < 2 ? <div className="h-px w-4 bg-black/10 dark:bg-white/10" /> : null}
              </React.Fragment>
            ))}
          </div>

          {step === "identity" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-black/70 dark:text-white/70">
                  Full name
                </label>
                <input
                  type="text"
                  value={data.name || ""}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                  placeholder="Jane Doe"
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 dark:text-white/70">
                  Role <span className="text-black/40 dark:text-white/40">(optional)</span>
                </label>
                <input
                  type="text"
                  value={data.role || ""}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                  placeholder="e.g. Product Manager"
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
                  onClick={() => setStep("placement")}
                  disabled={!data.name?.trim()}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "placement" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-black/70 dark:text-white/70">
                  Reports to <span className="text-black/40 dark:text-white/40">(optional)</span>
                </label>
                <select
                  value={data.managerId || ""}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
                  onChange={(e) => setData({ ...data, managerId: e.target.value || undefined })}
                >
                  <option value="">Not set</option>
                  {peopleOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 dark:text-white/70">
                  Team <span className="text-black/40 dark:text-white/40">(optional)</span>
                </label>
                <select
                  value={data.teamId || ""}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
                  onChange={(e) => setData({ ...data, teamId: e.target.value || undefined })}
                >
                  <option value="">Not set</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                  onClick={() => setStep("identity")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  onClick={() => setStep("review")}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Name:</span>
                    <span className="font-medium text-black/90 dark:text-white/90">{data.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Role:</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      {data.role || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Manager:</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      {managerName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Team:</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      {teamName || "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                You can complete missing fields later. LoopBrain will track gaps.
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                  onClick={() => setStep("placement")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  onClick={handleCreate}
                >
                  Add to org
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

