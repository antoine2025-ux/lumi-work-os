"use client";

import { redirect } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, X, Pencil, Trash2, Loader2, FileText, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobDescription = {
  id: string;
  title: string;
  summary: string | null;
  level: string | null;
  jobFamily: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];
  positionCount: number;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  summary: string;
  level: string;
  jobFamily: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  level: "",
  jobFamily: "",
  responsibilities: [],
  requiredSkills: [],
  preferredSkills: [],
  keyMetrics: [],
};

type Position = {
  id: string;
  title: string | null;
  userId: string | null;
  userName: string | null;
  teamName: string | null;
  departmentName: string | null;
};

// ─── Assign Positions Dialog ──────────────────────────────────────────────────

function AssignPositionsDialog({
  open,
  onClose,
  jd,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  jd: JobDescription | null;
  onSaved: () => void;
}) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track pending changes: positionId → new jdId (this jd's id) or null (unlink)
  const [changes, setChanges] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!open || !jd) return;
    setChanges(new Map());
    setError(null);
    setLoadingPositions(true);

    Promise.all([
      fetch("/api/org/positions").then((r) => r.json()),
      fetch(`/api/org/job-descriptions/${jd.id}`).then((r) => r.json()),
    ])
      .then(([posData, jdData]) => {
        setPositions(posData.positions ?? []);
        const linked: string[] = (jdData.jobDescription?.positions ?? []).map(
          (p: { id: string }) => p.id
        );
        setLinkedIds(new Set(linked));
      })
      .catch(() => setError("Failed to load positions"))
      .finally(() => setLoadingPositions(false));
  }, [open, jd]);

  const togglePosition = (positionId: string) => {
    setChanges((prev) => {
      const next = new Map(prev);
      const currentlyLinked = linkedIds.has(positionId);
      const pendingChange = next.get(positionId);

      if (pendingChange !== undefined) {
        // Revert the pending change
        next.delete(positionId);
      } else {
        // Queue a change
        next.set(positionId, currentlyLinked ? null : jd!.id);
      }
      return next;
    });
  };

  const isEffectivelyLinked = (positionId: string): boolean => {
    if (changes.has(positionId)) {
      return changes.get(positionId) !== null;
    }
    return linkedIds.has(positionId);
  };

  const handleSave = async () => {
    if (!jd || changes.size === 0) { onClose(); return; }
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.all(
        Array.from(changes.entries()).map(([positionId, jobDescriptionId]) =>
          fetch(`/api/org/positions/${positionId}/job-description`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescriptionId }),
          }).then((r) => r.json())
        )
      );
      const failed = results.find((r) => !r.ok);
      if (failed) { setError(failed.error ?? "Some updates failed"); return; }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const changedCount = changes.size;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Positions
          </DialogTitle>
          <DialogDescription>
            {jd ? (
              <>
                Link positions to <strong>{jd.title}</strong>. Toggle each position to assign or unassign.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {loadingPositions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : positions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No positions found in workspace.</p>
          ) : (
            positions.map((pos) => {
              const linked = isEffectivelyLinked(pos.id);
              const changed = changes.has(pos.id);
              const label = pos.userName ?? pos.title ?? "Unnamed position";
              const sub = [pos.title !== pos.userName ? pos.title : null, pos.teamName ?? pos.departmentName]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => togglePosition(pos.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    linked
                      ? "border-blue-700/60 bg-blue-900/20"
                      : "border-[#1e293b] bg-[#0B1220] hover:border-slate-600"
                  } ${changed ? "ring-1 ring-amber-500/40" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{label}</p>
                    {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      linked
                        ? "border-blue-600 text-blue-300 text-xs shrink-0"
                        : "border-slate-700 text-slate-500 text-xs shrink-0"
                    }
                  >
                    {linked ? "Linked" : "Unlinked"}
                  </Badge>
                </button>
              );
            })
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingPositions}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : changedCount > 0 ? (
              `Save ${changedCount} change${changedCount !== 1 ? "s" : ""}`
            ) : (
              "Done"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tag input helper ─────────────────────────────────────────────────────────

function TagInput({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) {
      onChange([...items, v]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 text-xs">
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create/Edit dialog ───────────────────────────────────────────────────────

function JDDialog({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: JobDescription | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        editing
          ? {
              title: editing.title,
              summary: editing.summary ?? "",
              level: editing.level ?? "",
              jobFamily: editing.jobFamily ?? "",
              responsibilities: editing.responsibilities,
              requiredSkills: editing.requiredSkills,
              preferredSkills: editing.preferredSkills,
              keyMetrics: editing.keyMetrics,
            }
          : EMPTY_FORM
      );
    }
  }, [open, editing]);

  const set = (field: keyof FormState, value: FormState[keyof FormState]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/org/job-descriptions/${editing.id}`
        : "/api/org/job-descriptions";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          level: form.level.trim() || undefined,
          jobFamily: form.jobFamily.trim() || undefined,
          responsibilities: form.responsibilities,
          requiredSkills: form.requiredSkills,
          preferredSkills: form.preferredSkills,
          keyMetrics: form.keyMetrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Job Description" : "Create Job Description"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this shared job description template."
              : "Define a reusable job description that can be linked to many positions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="jd-title">Title *</Label>
            <Input
              id="jd-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g., Software Engineer, Product Manager"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jd-level">Level</Label>
              <Input
                id="jd-level"
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                placeholder="e.g., Junior, Mid, Senior"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jd-family">Job Family</Label>
              <Input
                id="jd-family"
                value={form.jobFamily}
                onChange={(e) => set("jobFamily", e.target.value)}
                placeholder="e.g., Engineering, Design"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jd-summary">Summary</Label>
            <Textarea
              id="jd-summary"
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="2-3 sentence overview of this role"
              rows={3}
            />
          </div>

          <TagInput
            label="Responsibilities"
            items={form.responsibilities}
            onChange={(v) => set("responsibilities", v)}
            placeholder="Add a responsibility, press Enter"
          />
          <TagInput
            label="Required Skills"
            items={form.requiredSkills}
            onChange={(v) => set("requiredSkills", v)}
            placeholder="e.g., TypeScript, React"
          />
          <TagInput
            label="Preferred Skills"
            items={form.preferredSkills}
            onChange={(v) => set("preferredSkills", v)}
            placeholder="e.g., Go, Kubernetes"
          />
          <TagInput
            label="Key Metrics"
            items={form.keyMetrics}
            onChange={(v) => set("keyMetrics", v)}
            placeholder="e.g., Deploy frequency, CSAT score"
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function JobDescriptionsAdminPage() {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<JobDescription | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/job-descriptions");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          redirect("/");
        }
        return;
      }
      const data = await res.json();
      setJds(data.jobDescriptions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (jd: JobDescription) => { setEditing(jd); setDialogOpen(true); };

  const handleDelete = async (jd: JobDescription) => {
    if (jd.positionCount > 0) {
      setDeleteError(`Cannot delete "${jd.title}" — ${jd.positionCount} position(s) still linked. Unlink them first.`);
      return;
    }
    setDeleting(jd.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/org/job-descriptions/${jd.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Failed to delete"); return; }
      await load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Job Descriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Shared templates that can be linked to multiple positions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
          {deleteError}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-[#1e293b] bg-[#0B1220] animate-pulse" />
          ))}
        </div>
      ) : jds.length === 0 ? (
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No job descriptions yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Create one to link shared role expectations to positions.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job Description
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jds.map((jd) => (
            <Card key={jd.id} className="border-[#1e293b] bg-[#0B1220]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-slate-50 text-base font-semibold truncate">
                      {jd.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {jd.level && (
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {jd.level}
                        </Badge>
                      )}
                      {jd.jobFamily && (
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {jd.jobFamily}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {jd.positionCount} position{jd.positionCount !== 1 ? "s" : ""} linked
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-slate-200 gap-1.5"
                      onClick={() => setAssigning(jd)}
                      title="Assign to positions"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Assign</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-slate-200"
                      onClick={() => openEdit(jd)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-500 hover:text-red-400"
                      onClick={() => handleDelete(jd)}
                      disabled={deleting === jd.id}
                    >
                      {deleting === jd.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {jd.summary && (
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-400 line-clamp-2">{jd.summary}</p>
                </CardContent>
              )}
              {(jd.responsibilities.length > 0 || jd.requiredSkills.length > 0) && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {jd.requiredSkills.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-blue-900 text-blue-400">
                        {s}
                      </Badge>
                    ))}
                    {jd.requiredSkills.length > 5 && (
                      <span className="text-xs text-slate-500">+{jd.requiredSkills.length - 5} more</span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <JDDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        onSaved={load}
      />

      <AssignPositionsDialog
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        jd={assigning}
        onSaved={load}
      />
    </div>
  );
}
