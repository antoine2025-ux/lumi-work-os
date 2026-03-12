"use client";

/**
 * Set Authority Drawer
 * 
 * Configure primary and escalation authority for a decision domain.
 * Phase I: UI renders API output; ranking logic is server-side.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2, User, Users } from "lucide-react";

type DomainSummary = {
  id: string;
  key: string;
  name: string;
};

type AuthorityStep = {
  type: "PERSON" | "ROLE";
  personId?: string;
  roleType?: string;
};

type SetAuthorityDrawerProps = {
  domain: DomainSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function SetAuthorityDrawer({
  domain,
  open,
  onOpenChange,
  onSuccess,
}: SetAuthorityDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  // Form state
  const [primaryType, setPrimaryType] = useState<"PERSON" | "ROLE">("PERSON");
  const [primaryPersonId, setPrimaryPersonId] = useState("");
  const [primaryRoleType, setPrimaryRoleType] = useState("");
  const [escalationSteps, setEscalationSteps] = useState<AuthorityStep[]>([]);

  // Load existing authority when domain changes
  useEffect(() => {
    if (domain && open) {
      fetchDomainAuthority();
      fetchPeople();
    }
  }, [domain, open]);

  const fetchDomainAuthority = async () => {
    if (!domain) return;

    try {
      const response = await fetch(`/api/org/decision/domains/${domain.key}`);
      if (!response.ok) return;

      const data = await response.json();
      const authority = data.domain?.authority;

      if (authority) {
        if (authority.primaryPersonId) {
          setPrimaryType("PERSON");
          setPrimaryPersonId(authority.primaryPersonId);
          setPrimaryRoleType("");
        } else if (authority.primaryRoleType) {
          setPrimaryType("ROLE");
          setPrimaryPersonId("");
          setPrimaryRoleType(authority.primaryRoleType);
        }

        const steps = (authority.escalationSteps ?? []).map(
          (step: { personId?: string; roleType?: string }) => ({
            type: step.personId ? "PERSON" : "ROLE",
            personId: step.personId,
            roleType: step.roleType,
          })
        ) as AuthorityStep[];
        setEscalationSteps(steps);
      } else {
        resetForm();
      }
    } catch (err: unknown) {
      console.error("Failed to fetch authority:", err);
    }
  };

  const fetchPeople = async () => {
    try {
      setLoadingPeople(true);
      const response = await fetch("/api/org/people");
      if (!response.ok) throw new Error("Failed to fetch people");

      const data = await response.json();
      setPeople(
        (data.people ?? []).map((p: { id: string; name: string; email?: string }) => ({
          id: p.id,
          name: p.name || p.email || p.id,
        }))
      );
    } catch (err: unknown) {
      console.error("Failed to fetch people:", err);
    } finally {
      setLoadingPeople(false);
    }
  };

  const resetForm = () => {
    setPrimaryType("PERSON");
    setPrimaryPersonId("");
    setPrimaryRoleType("");
    setEscalationSteps([]);
    setError(null);
  };

  const handleAddEscalation = () => {
    setEscalationSteps([...escalationSteps, { type: "PERSON", personId: "" }]);
  };

  const handleRemoveEscalation = (index: number) => {
    setEscalationSteps(escalationSteps.filter((_, i) => i !== index));
  };

  const handleUpdateEscalation = (index: number, updates: Partial<AuthorityStep>) => {
    setEscalationSteps(
      escalationSteps.map((step, i) => (i === index ? { ...step, ...updates } : step))
    );
  };

  const handleSubmit = async () => {
    if (!domain) return;

    setLoading(true);
    setError(null);

    try {
      // Build request body
      const primary: { personId?: string; roleType?: string } = {};
      if (primaryType === "PERSON") {
        if (!primaryPersonId) {
          throw new Error("Please select a primary person");
        }
        primary.personId = primaryPersonId;
      } else {
        if (!primaryRoleType.trim()) {
          throw new Error("Please enter a primary role type");
        }
        primary.roleType = primaryRoleType.trim();
      }

      const escalation = escalationSteps
        .filter((step) => step.personId || step.roleType)
        .map((step) => ({
          personId: step.type === "PERSON" ? step.personId : undefined,
          roleType: step.type === "ROLE" ? step.roleType : undefined,
        }));

      const response = await fetch(`/api/org/decision/domains/${domain.key}/authority`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary, escalation }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to set authority");
      }

      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Set Decision Authority</SheetTitle>
          <SheetDescription>
            {domain ? (
              <>
                Configure who decides for <strong>{domain.name}</strong> ({domain.key})
              </>
            ) : (
              "Configure decision authority"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Primary Decider */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Primary Decider</Label>
            </div>

            <div className="flex gap-2">
              <Select
                value={primaryType}
                onValueChange={(v) => setPrimaryType(v as "PERSON" | "ROLE")}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSON">Person</SelectItem>
                  <SelectItem value="ROLE">Role</SelectItem>
                </SelectContent>
              </Select>

              {primaryType === "PERSON" ? (
                <Select value={primaryPersonId} onValueChange={setPrimaryPersonId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPeople ? (
                      <div className="p-2 text-center text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="flex-1"
                  value={primaryRoleType}
                  onChange={(e) => setPrimaryRoleType(e.target.value)}
                  placeholder="e.g., Engineering Manager"
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {primaryType === "PERSON"
                ? "This person will be the primary decision maker."
                : "The first person matching this role will be the primary decision maker."}
            </p>
          </div>

          {/* Escalation Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Escalation Path</Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddEscalation}>
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>

            {escalationSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                No escalation steps. Add steps for when primary is unavailable.
              </p>
            ) : (
              <div className="space-y-3">
                {escalationSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <Select
                      value={step.type}
                      onValueChange={(v) =>
                        handleUpdateEscalation(index, {
                          type: v as "PERSON" | "ROLE",
                          personId: v === "PERSON" ? "" : undefined,
                          roleType: v === "ROLE" ? "" : undefined,
                        })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERSON">Person</SelectItem>
                        <SelectItem value="ROLE">Role</SelectItem>
                      </SelectContent>
                    </Select>

                    {step.type === "PERSON" ? (
                      <Select
                        value={step.personId ?? ""}
                        onValueChange={(v) => handleUpdateEscalation(index, { personId: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="flex-1"
                        value={step.roleType ?? ""}
                        onChange={(e) =>
                          handleUpdateEscalation(index, { roleType: e.target.value })
                        }
                        placeholder="Role type"
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEscalation(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Escalation steps are used when the primary decider is unavailable.
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>
              <strong>How LoopBrain uses this:</strong> When work requires escalation,
              LoopBrain will show these contacts and recommend who to reach based on
              availability.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Authority
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
