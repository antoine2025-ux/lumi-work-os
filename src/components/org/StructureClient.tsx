/**
 * Structure Client Component
 * 
 * Displays organizational structure (departments and teams).
 * Fetches data from Org API and provides write controls when feature flag is enabled.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { useOrgReadiness } from "@/components/org/useOrgReadiness";
import { SetupNudgeBanner } from "@/components/org/SetupNudgeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StructureWriteControls } from "@/components/org/StructureWriteControls";
import { OrgSectionEmpty } from "@/components/org/OrgSectionState";

export function StructureClient() {
  const [structureKey, setStructureKey] = useState(0);
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), [structureKey]);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const { readiness } = useOrgReadiness();

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [memberDialogOpen, setMemberDialogOpen] = useState<Record<string, boolean>>({});
  const [teamDetails, setTeamDetails] = useState<Record<string, any>>({});
  const [loadingTeamDetails, setLoadingTeamDetails] = useState<Record<string, boolean>>({});
  const [addingMember, setAddingMember] = useState<Record<string, boolean>>({});
  const [selectedPersonId, setSelectedPersonId] = useState<Record<string, string>>({});

  const canWrite = flagsQ.data?.flags?.structureWrite === true;

  const refetchStructure = useCallback(() => {
    setStructureKey((prev) => prev + 1);
  }, []);

  if (structureQ.loading || flagsQ.loading) {
    return <div className="text-sm text-muted-foreground">Loading structure…</div>;
  }
  
  // Show error state if API failed (not empty state)
  if (structureQ.error || flagsQ.error) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
        <div className="font-semibold">Error loading structure</div>
        <div className="mt-2 text-red-200">
          {structureQ.error || flagsQ.error || "Failed to load organizational structure. Please try refreshing the page."}
        </div>
      </div>
    );
  }

  // If no data returned, show error (not empty state)
  if (!structureQ.data) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
        <div className="font-semibold">Error loading structure</div>
        <div className="mt-2 text-red-200">
          No data returned from the server. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const data = structureQ.data;
  // Support both { ok, data: { people } } and { people } response shapes
  const people = (peopleQ.data as any)?.data?.people ?? peopleQ.data?.people ?? [];
  const structureDefinedItem = readiness?.items.find((i) => i.key === "structure_defined");
  const hasDepartments = data.departments.length > 0;
  const hasTeams = data.teams.length > 0;

  async function setOwner(teamId: string, ownerPersonId: string | null) {
    const key = `owner-${teamId}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: null }));

    try {
      await OrgApi.setTeamOwner(teamId, { ownerPersonId });
      refetchStructure();
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, [key]: e?.message || "Failed to set owner." }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function loadTeamDetails(teamId: string) {
    if (teamDetails[teamId]) return; // Already loaded
    
    setLoadingTeamDetails((prev) => ({ ...prev, [teamId]: true }));
    try {
      const detail = await OrgApi.getTeamDetail(teamId);
      setTeamDetails((prev) => ({ ...prev, [teamId]: detail.team }));
    } catch (e: any) {
      console.error("Failed to load team details:", e);
    } finally {
      setLoadingTeamDetails((prev) => ({ ...prev, [teamId]: false }));
    }
  }

  async function addMember(teamId: string) {
    const personId = selectedPersonId[teamId];
    if (!personId) {
      setErrors((prev) => ({ ...prev, [`add-${teamId}`]: "Please select a person." }));
      return;
    }

    const key = `add-${teamId}`;
    setAddingMember((prev) => ({ ...prev, [teamId]: true }));
    setErrors((prev) => ({ ...prev, [key]: null }));

    try {
      await OrgApi.addTeamMember(teamId, { personId });
      // Reload team details
      const detail = await OrgApi.getTeamDetail(teamId);
      setTeamDetails((prev) => ({ ...prev, [teamId]: detail.team }));
      setSelectedPersonId((prev) => ({ ...prev, [teamId]: "" }));
      refetchStructure();
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, [key]: e?.message || "Failed to add member." }));
    } finally {
      setAddingMember((prev) => ({ ...prev, [teamId]: false }));
    }
  }

  async function removeMember(teamId: string, personId: string) {
    const key = `remove-${teamId}-${personId}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: null }));

    try {
      await OrgApi.removeTeamMember(teamId, { personId });
      // Reload team details
      const detail = await OrgApi.getTeamDetail(teamId);
      setTeamDetails((prev) => ({ ...prev, [teamId]: detail.team }));
      refetchStructure();
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, [key]: e?.message || "Failed to remove member." }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  function openMemberDialog(teamId: string) {
    setMemberDialogOpen((prev) => ({ ...prev, [teamId]: true }));
    loadTeamDetails(teamId);
  }

  function closeMemberDialog(teamId: string) {
    setMemberDialogOpen((prev) => ({ ...prev, [teamId]: false }));
  }

  // Empty state when no structure exists
  // Only show if there are zero departments AND zero teams
  if (data.departments.length === 0 && data.teams.length === 0) {
    return (
      <div className="space-y-4">
        <OrgSectionEmpty
          title="Define your structure"
          description="Create departments or teams so people have a place in the org."
        />
        {canWrite && (
          <div className="flex justify-center">
            <StructureWriteControls
              departments={[]}
              onSuccess={refetchStructure}
            />
          </div>
        )}
        {!canWrite && (
          <div className="text-sm text-muted-foreground text-center">
            You don't have permission to edit structure.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner when structure is incomplete */}
      {!structureDefinedItem?.complete && (
        <SetupNudgeBanner
          title="Define your org structure"
          message="Create departments or teams so people have a place in the org."
          ctaLabel="Create structure"
          href="/org/structure"
          severity="warning"
        />
      )}

      {/* Info banner when teams exist but no departments */}
      {hasTeams && !hasDepartments && (
        <SetupNudgeBanner
          title="Departments are optional"
          message="You have teams but no departments. Departments help organize teams into larger groups."
          ctaLabel="Create department"
          href="/org/structure"
          severity="info"
        />
      )}

      {canWrite && (
        <div className="flex items-center justify-end">
          <StructureWriteControls
            departments={data.departments.map((d) => ({ id: d.id, name: d.name }))}
            onSuccess={refetchStructure}
          />
        </div>
      )}
      {!canWrite && (
        <div className="text-sm text-muted-foreground">
          You don't have permission to edit structure.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.departments.length === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">No departments yet.</div>
              {canWrite && (
                <StructureWriteControls
                  departments={[]}
                  onSuccess={refetchStructure}
                />
              )}
              {!hasTeams && !canWrite && (
                <div className="text-xs text-muted-foreground">
                  Create departments to organize your teams, or create teams directly.
                </div>
              )}
            </div>
          ) : (
            data.departments.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.teams.length} teams</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.teams.length === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">No teams yet.</div>
              {canWrite && (
                <StructureWriteControls
                  departments={data.departments.map((d) => ({ id: d.id, name: d.name }))}
                  onSuccess={refetchStructure}
                />
              )}
              {!hasDepartments && !canWrite && (
                <div className="text-xs text-muted-foreground">
                  Create teams to organize your people. You can optionally create departments first to group teams.
                </div>
              )}
            </div>
          ) : (
            data.teams.map((t) => {
              // Note: members array is no longer in structure response
              // For member management, use team detail endpoint or manage via positions
              const currentOwnerId = t.ownerPersonId || "__none__";
              const ownerError = errors[`owner-${t.id}`];
              const savingOwner = saving[`owner-${t.id}`] || false;

              return (
                <div key={t.id} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.memberCount} member{t.memberCount !== 1 ? "s" : ""}
                      {t.departmentId && (
                        <>
                          {" • "}
                          {data.departments.find((d) => d.id === t.departmentId)?.name || "Unknown department"}
                        </>
                      )}
                    </div>
                  </div>

                  {canWrite && (
                    <div className="space-y-3">
                      {/* Set owner */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Owner</div>
                        <Select
                          disabled={savingOwner}
                          value={currentOwnerId}
                          onValueChange={(v) => setOwner(t.id, v === "__none__" ? null : v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select owner…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No owner</SelectItem>
                            {people.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ownerError && (
                          <div className="text-xs text-destructive">{ownerError}</div>
                        )}
                      </div>

                      {/* Manage members */}
                      <div className="space-y-2">
                        <Dialog
                          open={memberDialogOpen[t.id] || false}
                          onOpenChange={(open) => {
                            if (open) {
                              openMemberDialog(t.id);
                            } else {
                              closeMemberDialog(t.id);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              Manage members
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Team members: {t.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {loadingTeamDetails[t.id] ? (
                                <div className="text-sm text-muted-foreground">Loading members…</div>
                              ) : (
                                <>
                                  {/* Current members */}
                                  <div className="space-y-2">
                                    <Label>Current members</Label>
                                    {teamDetails[t.id]?.members?.length > 0 ? (
                                      <div className="space-y-2">
                                        {teamDetails[t.id].members.map((m: any) => (
                                          <div
                                            key={m.personId}
                                            className="flex items-center justify-between rounded-lg border p-2"
                                          >
                                            <div>
                                              <div className="text-sm font-medium">{m.fullName}</div>
                                              {m.email && (
                                                <div className="text-xs text-muted-foreground">
                                                  {m.email}
                                                </div>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeMember(t.id, m.personId)}
                                              disabled={saving[`remove-${t.id}-${m.personId}`]}
                                            >
                                              {saving[`remove-${t.id}-${m.personId}`]
                                                ? "Removing…"
                                                : "Remove"}
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">
                                        No members yet.
                                      </div>
                                    )}
                                  </div>

                                  {/* Add member */}
                                  <div className="space-y-2">
                                    <Label>Add member</Label>
                                    <div className="flex gap-2">
                                      <Select
                                        value={selectedPersonId[t.id] || ""}
                                        onValueChange={(v) =>
                                          setSelectedPersonId((prev) => ({ ...prev, [t.id]: v }))
                                        }
                                        disabled={addingMember[t.id]}
                                      >
                                        <SelectTrigger className="flex-1">
                                          <SelectValue placeholder="Select person…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {people
                                            .filter(
                                              (p) =>
                                                !teamDetails[t.id]?.members?.some(
                                                  (m: any) => m.personId === p.id
                                                )
                                            )
                                            .map((p) => (
                                              <SelectItem key={p.id} value={p.id}>
                                                {p.fullName}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        onClick={() => addMember(t.id)}
                                        disabled={addingMember[t.id] || !selectedPersonId[t.id]}
                                      >
                                        {addingMember[t.id] ? "Adding…" : "Add"}
                                      </Button>
                                    </div>
                                    {errors[`add-${t.id}`] && (
                                      <div className="text-xs text-destructive">
                                        {errors[`add-${t.id}`]}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
