/**
 * Add Person Form — 3-step wizard
 *
 * Step 1: Role (job description + custom title)
 * Step 2: Placement (dept, team, manager, start date, employment type, location, timezone)
 * Step 3: Person & Invite (name, email, add method, role card option, summary)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type JobDescription = {
  id: string;
  title: string;
  level: string | null;
  jobFamily: string | null;
  summary: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];
};

interface WizardState {
  // Step 1: Role
  jobDescriptionId: string;
  customTitle: string;
  // Step 2: Placement
  departmentId: string;
  teamId: string;
  managerId: string;
  startDate: string;
  employmentType: string;
  location: string;
  timezone: string;
  // Step 3: Person & Invite
  fullName: string;
  email: string;
  addMethod: "direct" | "invite";
  workspaceRole: "MEMBER" | "ADMIN" | "VIEWER";
  autoCreateRoleCard: boolean;
}

const EMPTY_STATE: WizardState = {
  jobDescriptionId: "",
  customTitle: "",
  departmentId: "",
  teamId: "",
  managerId: "",
  startDate: "",
  employmentType: "",
  location: "",
  timezone: "",
  fullName: "",
  email: "",
  addMethod: "direct",
  workspaceRole: "MEMBER",
  autoCreateRoleCard: true,
};

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contractor" },
  { value: "intern", label: "Intern" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Role", "Placement", "Person"] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 pt-1">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as 1 | 2 | 3;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                    ? "bg-primary/25 text-primary"
                    : "border border-border text-muted-foreground"
                )}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 mx-0.5",
                  done ? "bg-primary/30" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type AddPersonFormProps = {
  /** Workspace ID for invite flow. Passed from server for reliable resolution. */
  workspaceId?: string;
};

export function AddPersonForm({ workspaceId: propWorkspaceId }: AddPersonFormProps = {}) {
  const router = useRouter();
  const orgUrl = useOrgUrl();
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [jdsLoading, setJdsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(EMPTY_STATE);

  function set<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    fetch("/api/org/job-descriptions")
      .then((r) => r.json())
      .then((data: { jobDescriptions?: JobDescription[] }) =>
        setJds(data.jobDescriptions ?? [])
      )
      .catch(() => setJds([]))
      .finally(() => setJdsLoading(false));
  }, []);

  const departments = structureQ.data?.departments ?? [];
  const allTeams = structureQ.data?.teams ?? [];
  const people = peopleQ.data?.people ?? [];
  const canWrite = flagsQ.data?.flags?.peopleWrite === true;
  const loading =
    flagsQ.loading || structureQ.loading || peopleQ.loading || jdsLoading;

  const selectedJd = useMemo(
    () => jds.find((j) => j.id === state.jobDescriptionId) ?? null,
    [jds, state.jobDescriptionId]
  );

  const teamsForDept = useMemo(() => {
    if (!state.departmentId) return allTeams;
    return allTeams.filter((t) => t.departmentId === state.departmentId);
  }, [allTeams, state.departmentId]);

  const selectedDept = departments.find((d) => d.id === state.departmentId);
  const selectedTeam = allTeams.find((t) => t.id === state.teamId);
  const selectedManager = people.find((p) => p.id === state.managerId);

  // Filter manager candidates by selected team → department → all (in that priority)
  // Each person has nested `team: { id } | null` and `department: { id } | null`
  const filteredManagers = useMemo(() => {
    if (state.teamId) {
      const inTeam = people.filter((p) => p.team?.id === state.teamId);
      return inTeam.length > 0 ? inTeam : people;
    }
    if (state.departmentId) {
      const inDept = people.filter((p) => p.department?.id === state.departmentId);
      return inDept.length > 0 ? inDept : people;
    }
    return people;
  }, [people, state.teamId, state.departmentId]);

  // Reset manager if the selected one is no longer in the filtered list
  useEffect(() => {
    if (state.managerId && !filteredManagers.some((p) => p.id === state.managerId)) {
      set("managerId", "");
    }
  }, [filteredManagers, state.managerId]);

  const step1Valid = !!state.jobDescriptionId || !!state.customTitle.trim();
  const step3Valid =
    !!state.fullName.trim() &&
    (state.addMethod === "direct" || !!state.email.trim());

  function handleJdSelect(jdId: string) {
    const jd = jds.find((j) => j.id === jdId);
    set("jobDescriptionId", jdId);
    // Pre-fill title from JD only if custom title is still empty
    if (jd && !state.customTitle) {
      set("customTitle", jd.level ? `${jd.title} (${jd.level})` : jd.title);
    }
  }

  function handleDeptChange(v: string) {
    set("departmentId", v === "__none__" ? "" : v);
    set("teamId", ""); // reset team when dept changes
  }

  async function handleSubmit() {
    setError(null);
    const name = state.fullName.trim();
    const email = state.email.trim();

    if (!name) { setError("Full name is required."); return; }
    if (state.addMethod === "invite" && !email) {
      setError("Email is required for invitations.");
      return;
    }
    if (!canWrite) { setError("Adding people is currently disabled."); return; }

    const title = state.customTitle.trim() || selectedJd?.title || undefined;

    setSaving(true);
    try {
      if (state.addMethod === "direct") {
        const res = await fetch("/api/org/people/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name,
            ...(email && { email }),
            ...(title && { title }),
            ...(state.departmentId && { departmentId: state.departmentId }),
            ...(state.teamId && { teamId: state.teamId }),
            ...(state.managerId && { managerId: state.managerId }),
            ...(state.jobDescriptionId && { jobDescriptionId: state.jobDescriptionId }),
            ...(state.startDate && { startDate: state.startDate }),
            ...(state.employmentType && { employmentType: state.employmentType }),
            ...(state.location && { location: state.location }),
            ...(state.timezone && { timezone: state.timezone }),
            autoCreateRoleCard: state.autoCreateRoleCard,
          }),
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to create person");

        router.push(orgUrl.person(data.id!));
        router.refresh();
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("org:person:created"));
          }
        }, 100);
      } else {
        // Invite path — use fetch directly so we can pass jobDescriptionId
        if (!propWorkspaceId) {
          setError("Workspace context not available. Please refresh and try again.");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/org/invitations/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            workspaceId: propWorkspaceId,
            fullName: name,
            ...(title && { title }),
            ...(state.departmentId && { departmentId: state.departmentId }),
            ...(state.teamId && { teamId: state.teamId }),
            ...(state.managerId && { managerId: state.managerId }),
            role: state.workspaceRole,
            ...(state.jobDescriptionId && { jobDescriptionId: state.jobDescriptionId }),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: { code?: string; message?: string } | string;
          message?: string;
        };
        if (!res.ok) {
          const msg =
            typeof data.error === "object"
              ? data.error?.message
              : (data.error as string) ?? data.message ?? "Failed to send invitation";
          throw new Error(msg ?? "Failed to send invitation");
        }

        router.push(orgUrl.directory);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email already exists") || msg.includes("already exists") || msg.includes("duplicate")) {
        setError(msg);
      } else if (msg.includes("already a member")) {
        setError("This user is already a member of the workspace.");
      } else if (msg.includes("pending invitation")) {
        setError("A pending invitation for this email already exists.");
      } else if (msg.includes("cannot invite yourself")) {
        setError("You cannot invite yourself.");
      } else if (
        msg.includes("permission") ||
        msg.includes("Forbidden") ||
        msg.includes("403")
      ) {
        setError("You don't have permission to invite members. Admin or Owner role is required.");
      } else if (msg.includes("409")) {
        setError("A person with this email already exists. Please use a different email.");
      } else {
        setError(
          state.addMethod === "direct"
            ? "Failed to create person. Please try again."
            : "Failed to send invitation. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle>Add to organization</CardTitle>
        <StepIndicator current={step} />
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Job description</Label>
              <Select
                value={state.jobDescriptionId || "__none__"}
                onValueChange={(v) =>
                  v === "__none__" ? set("jobDescriptionId", "") : handleJdSelect(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job description…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — enter title manually</SelectItem>
                  {jds.map((jd) => (
                    <SelectItem key={jd.id} value={jd.id}>
                      {jd.title}{jd.level ? ` (${jd.level})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* JD preview */}
            {selectedJd && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {selectedJd.title}{selectedJd.level ? ` (${selectedJd.level})` : ""}
                  </span>
                  {selectedJd.jobFamily && (
                    <Badge variant="secondary" className="text-xs">{selectedJd.jobFamily}</Badge>
                  )}
                </div>
                {selectedJd.summary && (
                  <p className="text-muted-foreground">{selectedJd.summary}</p>
                )}
                {selectedJd.responsibilities.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Responsibilities</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {selectedJd.responsibilities.slice(0, 4).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                      {selectedJd.responsibilities.length > 4 && (
                        <li>+{selectedJd.responsibilities.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {selectedJd.requiredSkills.length > 0 && (
                  <div>
                    <p className="font-medium mb-1.5">Required skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedJd.requiredSkills.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedJd.preferredSkills.length > 0 && (
                  <div>
                    <p className="font-medium mb-1.5">Preferred skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedJd.preferredSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customTitle">Job title</Label>
              <Input
                id="customTitle"
                value={state.customTitle}
                onChange={(e) => set("customTitle", e.target.value)}
                placeholder={selectedJd ? selectedJd.title : "e.g., Product Designer"}
              />
              <p className="text-xs text-muted-foreground">
                {selectedJd
                  ? "Pre-filled from the selected JD — edit to override."
                  : "Required if no job description is selected."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => router.push(orgUrl.directory)}>
                Cancel
              </Button>
              <Button disabled={!step1Valid} onClick={() => setStep(2)}>
                Next: Placement →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Placement ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={state.departmentId || "__none__"}
                  onValueChange={handleDeptChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={state.teamId || "__none__"}
                  onValueChange={(v) => set("teamId", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No team</SelectItem>
                    {teamsForDept.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Reports to (manager)</Label>
                <Select
                  value={state.managerId || "__none__"}
                  onValueChange={(v) => set("managerId", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No manager</SelectItem>
                    {filteredManagers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.fullName}{p.title ? ` — ${p.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={state.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Employment type</Label>
                <Select
                  value={state.employmentType || "__none__"}
                  onValueChange={(v) => set("employmentType", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={state.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g., New York, Remote"
                />
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={state.timezone || "__none__"}
                  onValueChange={(v) => set("timezone", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => router.push(orgUrl.directory)}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next: Person →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Person & Invite ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input
                  id="fullName"
                  value={state.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="e.g., Jane Doe"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email{state.addMethod === "invite" ? " *" : " (optional)"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={state.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@company.com"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Add method toggle */}
            <div className="space-y-2">
              <Label>How to add</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => set("addMethod", "direct")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    state.addMethod === "direct"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Add directly
                </button>
                <button
                  type="button"
                  onClick={() => set("addMethod", "invite")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    state.addMethod === "invite"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Send invitation
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {state.addMethod === "direct"
                  ? "Adds person to org structure immediately. Email is optional."
                  : "Sends an email invitation. They must accept to join the workspace."}
              </p>
            </div>

            {/* Workspace role — invite only */}
            {state.addMethod === "invite" && (
              <div className="space-y-2">
                <Label>Workspace role</Label>
                <Select
                  value={state.workspaceRole}
                  onValueChange={(v) => set("workspaceRole", v as "MEMBER" | "ADMIN" | "VIEWER")}
                  disabled={saving}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-create role card — only when a JD is selected */}
            {state.jobDescriptionId && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoCreateRoleCard"
                  checked={state.autoCreateRoleCard}
                  onCheckedChange={(checked) =>
                    set("autoCreateRoleCard", checked === true)
                  }
                  disabled={saving}
                />
                <Label
                  htmlFor="autoCreateRoleCard"
                  className="text-sm font-normal cursor-pointer"
                >
                  Auto-create role card from job description
                </Label>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
              <p className="font-medium">Summary</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Role</span>
                <span>
                  {state.customTitle ||
                    (selectedJd
                      ? selectedJd.level
                        ? `${selectedJd.title} (${selectedJd.level})`
                        : selectedJd.title
                      : "—")}
                </span>

                <span className="text-muted-foreground">Placement</span>
                <span>
                  {[
                    selectedDept?.name,
                    selectedTeam ? `→ ${selectedTeam.name}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || "No department / team"}
                </span>

                {selectedManager && (
                  <>
                    <span className="text-muted-foreground">Reports to</span>
                    <span>{selectedManager.fullName}</span>
                  </>
                )}

                {state.startDate && (
                  <>
                    <span className="text-muted-foreground">Start</span>
                    <span>
                      {state.startDate}
                      {state.employmentType
                        ? ` · ${EMPLOYMENT_TYPES.find((t) => t.value === state.employmentType)?.label ?? state.employmentType}`
                        : ""}
                    </span>
                  </>
                )}

                {state.jobDescriptionId && state.autoCreateRoleCard && (
                  <>
                    <span className="text-muted-foreground">Role card</span>
                    <span>Will be auto-created from JD</span>
                  </>
                )}
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            {!canWrite && (
              <div className="text-xs text-muted-foreground">
                Adding people is disabled. Enable org.people.write to activate.
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={saving}>
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push(orgUrl.directory)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    !step3Valid ||
                    !canWrite ||
                    (state.addMethod === "invite" && !propWorkspaceId)
                  }
                >
                  {saving
                    ? state.addMethod === "direct" ? "Creating…" : "Sending…"
                    : state.addMethod === "direct" ? "Create person" : "Send invitation"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

