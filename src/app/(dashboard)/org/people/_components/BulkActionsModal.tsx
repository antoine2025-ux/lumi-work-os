import React, { useMemo, useState } from "react";

type Person = {
  id: string;
  fullName?: string;
  name?: string;
  title?: string;
  role?: string;
  teamName?: string;
  team?: string;
  managerId?: string | null;
  managerName?: string | null;
  directReportCount?: number | null;
  location?: string | null;
};

type ManagerOption = { id: string; name: string };
type TeamOption = { name: string };

function safeName(p: Person) {
  return p.fullName || p.name || "Unnamed person";
}

function safeTeam(p: Person) {
  return p.teamName || p.team || "Team not set";
}

function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 transition",
          open ? "pointer-events-auto bg-black/25 opacity-100" : "pointer-events-none bg-transparent opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={[
          "fixed inset-0 z-50 flex items-center justify-center px-4 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="w-full max-w-[820px] rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-black">
          <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
            <div className="text-lg font-semibold tracking-[-0.02em] text-black dark:text-white">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                {subtitle}
              </div>
            ) : null}
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10">
            <div className="text-xs text-black/50 dark:text-white/50">
              Applies changes to the current filtered set.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Primary({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
        disabled
          ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
          : "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Ghost({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
    >
      {label}
    </button>
  );
}

export function BulkActionsModal({
  open,
  people,
  managers,
  teams,
  canEdit,
  onApplyBulk,
  onClose,
}: {
  open: boolean;
  people: Person[];
  managers: ManagerOption[];
  teams: TeamOption[];
  canEdit: boolean;
  onApplyBulk: (args: { ids: string[]; patch: { managerId?: string | null; managerName?: string | null; teamName?: string | null } }) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"assignManager" | "setTeam">("assignManager");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const patch = useMemo(() => {
    if (mode === "assignManager") {
      const m = managers.find((x) => x.id === selectedManagerId);
      return {
        managerId: selectedManagerId ? selectedManagerId : null,
        managerName: m?.name ?? null,
      };
    }
    return {
      teamName: selectedTeamName ? selectedTeamName : null,
    };
  }, [mode, selectedManagerId, selectedTeamName, managers]);

  const canApply = useMemo(() => {
    if (!canEdit) return false;
    if (people.length === 0) return false;
    if (mode === "assignManager") return selectedManagerId.length > 0;
    return selectedTeamName.length > 0;
  }, [canEdit, people.length, mode, selectedManagerId, selectedTeamName]);

  const preview = useMemo(() => {
    const rows = people.slice(0, 10).map((p) => ({
      id: p.id,
      name: safeName(p),
      before: mode === "setTeam" ? safeTeam(p) : (p.managerName || (p.managerId ? "Set" : "Not set")),
      after: mode === "setTeam"
        ? (patch.teamName || "Not set")
        : (patch.managerName || "Set"),
    }));
    return rows;
  }, [people, mode, patch]);

  async function handleApply() {
    if (!canApply) return;
    setLoading(true);
    setDone(null);
    try {
      await onApplyBulk({
        ids: people.map((p) => p.id),
        patch,
      });
      setDone(`Applied to ${people.length} people`);
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e?.message ?? "Bulk apply failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="Bulk actions"
      subtitle="Operate at scale: apply a change to the current filtered set."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-black/70 dark:text-white/70">
            Target set: <span className="font-semibold text-black/90 dark:text-white/90">{people.length}</span> people
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("assignManager")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
                mode === "assignManager"
                  ? "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30"
                  : "border border-black/10 bg-transparent text-black/70 hover:bg-black/5 hover:text-black focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20",
              ].join(" ")}
            >
              Assign manager
            </button>
            <button
              type="button"
              onClick={() => setMode("setTeam")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
                mode === "setTeam"
                  ? "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30"
                  : "border border-black/10 bg-transparent text-black/70 hover:bg-black/5 hover:text-black focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20",
              ].join(" ")}
            >
              Set team
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/10">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            {mode === "assignManager" ? "Assign manager" : "Set team"}
          </div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            Choose a value, review impact, then apply.
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {mode === "assignManager" ? (
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
              >
                <option value="">Select manager…</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedTeamName}
                onChange={(e) => setSelectedTeamName(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <Primary
              label={loading ? "Applying…" : "Apply"}
              onClick={handleApply}
              disabled={!canApply || loading}
            />
          </div>

          {!canEdit ? (
            <div className="mt-3 text-sm text-black/60 dark:text-white/60">
              Read-only access: bulk actions are disabled.
            </div>
          ) : null}

          {done ? (
            <div className="mt-3 rounded-xl border border-emerald-300/60 bg-emerald-50/60 p-3 text-sm text-black/70 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-white/70">
              <div className="font-medium">Success</div>
              <div className="mt-1 text-black/60 dark:text-white/60">{done}</div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Review
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            Showing up to 10 impacted records.
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <div className="grid grid-cols-3 bg-black/5 px-3 py-2 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
              <div>Person</div>
              <div>Before</div>
              <div>After</div>
            </div>
            {preview.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-3 gap-2 border-t border-black/10 px-3 py-2 text-sm text-black/70 dark:border-white/10 dark:text-white/70"
              >
                <div className="truncate font-medium text-black/90 dark:text-white/90">{r.name}</div>
                <div className="truncate text-black/60 dark:text-white/60">{r.before}</div>
                <div className="truncate">{r.after}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Ghost label="Close" onClick={onClose} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
