/**
 * Add Person Form Component
 * 
 * Premium form for creating a new person in the org.
 * Validates required fields, calls OrgApi.createPerson, and routes to profile on success.
 * Feature-flagged via org.people.write flag.
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AddPersonForm() {
  const router = useRouter();
  const orgUrl = useOrgUrl();
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);

  // Direct creation form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteDepartmentId, setInviteDepartmentId] = useState<string | null>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteManagerId, setInviteManagerId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canWrite = flagsQ.data?.flags?.peopleWrite === true;

  const departments = structureQ.data?.departments ?? [];
  const teams = structureQ.data?.teams ?? [];

  const teamsForDepartment = useMemo(() => {
    if (!departmentId) return teams;
    return teams.filter((t) => t.departmentId === departmentId);
  }, [teams, departmentId]);

  const inviteTeamsForDepartment = useMemo(() => {
    if (!inviteDepartmentId) return teams;
    return teams.filter((t) => t.departmentId === inviteDepartmentId);
  }, [teams, inviteDepartmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const name = fullName.trim();
    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (!canWrite) {
      setError("Adding people is currently disabled.");
      return;
    }

    setSaving(true);
    try {
      const payload: {
        fullName: string;
        email?: string;
        title?: string;
        departmentId?: string;
        teamId?: string;
        managerId?: string;
      } = { fullName: name };

      if (email.trim()) payload.email = email.trim();
      if (title.trim()) payload.title = title.trim();
      if (departmentId) payload.departmentId = departmentId;
      if (teamId) payload.teamId = teamId;
      if (managerId) payload.managerId = managerId;

      await OrgApi.createPerson(payload);

      // Redirect first, then trigger refresh
      router.push(orgUrl.directory);
      
      // Use router.refresh() to force server-side revalidation
      // This ensures the people list is updated with the new person
      router.refresh();
      
      // Also dispatch event as a backup for client-side refetch
      // Delay slightly to ensure navigation has started
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("org:person:created"));
        }
      }, 100);
    } catch (err: unknown) {
      // Log full error in development for debugging
      if (process.env.NODE_ENV !== "production") {
        console.error("[AddPersonForm] Error creating person:", err);
      }
      
      // Extract user-friendly error message from API response
      let errorMessage = "Failed to create person. Please try again.";
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg) {
        // If the error message is user-friendly (from API), use it
        if (
          errMsg.includes("email already exists") ||
          errMsg.includes("already exists") ||
          errMsg.includes("duplicate")
        ) {
          errorMessage = errMsg;
        } else if (errMsg.includes("409")) {
          // Conflict status code
          errorMessage = "A person with this email already exists. Please use a different email.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function onInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailTrimmed = inviteEmail.trim();
    const nameTrimmed = inviteFullName.trim();
    
    if (!emailTrimmed) {
      setError("Email is required for invitations.");
      return;
    }

    if (!nameTrimmed) {
      setError("Full name is required for invitations.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!canWrite) {
      setError("Sending invitations is currently disabled.");
      return;
    }

    setSaving(true);
    try {
      // Get workspaceId from current URL or context
      const workspaceId = window.location.pathname.split('/')[2]; // Extract from /w/[workspaceSlug]/...
      
      await OrgApi.createInvitation({
        email: emailTrimmed,
        workspaceId,
        fullName: nameTrimmed,
        title: inviteTitle.trim() || undefined,
        departmentId: inviteDepartmentId || undefined,
        teamId: inviteTeamId || undefined,
        managerId: inviteManagerId || undefined,
        role: inviteRole,
      });

      setSuccess(`Invitation sent successfully to ${emailTrimmed}!`);
      setInviteEmail("");
      setInviteFullName("");
      setInviteTitle("");
      setInviteDepartmentId(null);
      setInviteTeamId(null);
      setInviteManagerId(null);
      setInviteRole("MEMBER");
      
      // Optionally redirect after a short delay
      setTimeout(() => {
        router.push(orgUrl.directory);
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[AddPersonForm] Error sending invitation:", err);
      }
      
      let errorMessage = "Failed to send invitation. Please try again.";
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg) {
        if (errMsg.includes("already a member")) {
          errorMessage = "This user is already a member of the workspace.";
        } else if (errMsg.includes("pending invitation")) {
          errorMessage = "A pending invitation for this email already exists.";
        } else if (errMsg.includes("cannot invite yourself")) {
          errorMessage = "You cannot invite yourself.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const loading = flagsQ.loading || structureQ.loading || peopleQ.loading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add to organization</CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Add directly</TabsTrigger>
              <TabsTrigger value="invite">Send invitation</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Adds person to org structure immediately. Email is optional - use for placeholders or people already in the system.
              </div>
              <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Role / title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Product Designer"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Manager (optional)</Label>
                <Select
                  disabled={saving}
                  value={managerId || "__none__"}
                  onValueChange={(v) => setManagerId(v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No manager</SelectItem>
                    {(peopleQ.data?.people ?? []).map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.fullName}
                        {person.title && ` — ${person.title}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department (optional)</Label>
                <Select
                  disabled={saving}
                  value={departmentId || "__none__"}
                  onValueChange={(v) => {
                    setDepartmentId(v === "__none__" ? null : v);
                    setTeamId(null); // Reset team when department changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Team (optional)</Label>
                <Select
                  disabled={saving}
                  value={teamId || "__none__"}
                  onValueChange={(v) => setTeamId(v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No team</SelectItem>
                    {teamsForDepartment.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  You can assign reporting lines, ownership, and availability after creating the profile.
                </div>
              </div>
            </div>

                {error && <div className="text-sm text-destructive">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(orgUrl.directory)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || !canWrite}
                  >
                    {saving ? "Creating…" : "Create person"}
                  </Button>
                </div>

                {!canWrite && (
                  <div className="text-xs text-muted-foreground">
                    This action is hidden behind a feature flag. Enable org.people.write to activate it.
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Sends an email invitation. They must accept to join the workspace. You can specify their org placement upfront.
              </div>
              <form onSubmit={onInviteSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inviteFullName">Full name</Label>
                    <Input
                      id="inviteFullName"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="e.g., Jane Doe"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Workspace role</Label>
                    <Select
                      disabled={saving}
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as "ADMIN" | "MEMBER" | "VIEWER")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteTitle">Role / title (optional)</Label>
                    <Input
                      id="inviteTitle"
                      value={inviteTitle}
                      onChange={(e) => setInviteTitle(e.target.value)}
                      placeholder="e.g., Product Designer"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Manager (optional)</Label>
                    <Select
                      disabled={saving}
                      value={inviteManagerId || "__none__"}
                      onValueChange={(v) => setInviteManagerId(v === "__none__" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No manager</SelectItem>
                        {(peopleQ.data?.people ?? []).map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.fullName}
                            {person.title && ` — ${person.title}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Select
                      disabled={saving}
                      value={inviteDepartmentId || "__none__"}
                      onValueChange={(v) => {
                        setInviteDepartmentId(v === "__none__" ? null : v);
                        setInviteTeamId(null); // Reset team when department changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No department</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Team (optional)</Label>
                    <Select
                      disabled={saving}
                      value={inviteTeamId || "__none__"}
                      onValueChange={(v) => setInviteTeamId(v === "__none__" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No team</SelectItem>
                        {inviteTeamsForDepartment.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      When they accept the invitation, they'll be assigned to this team and department.
                    </div>
                  </div>
                </div>

                {error && <div className="text-sm text-destructive">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(orgUrl.directory)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || !canWrite}
                  >
                    {saving ? "Sending…" : "Send invitation"}
                  </Button>
                </div>

                {!canWrite && (
                  <div className="text-xs text-muted-foreground">
                    This action is hidden behind a feature flag. Enable org.people.write to activate it.
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

