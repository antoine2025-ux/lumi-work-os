"use client";

/**
 * Add Impact Drawer
 *
 * Creates explicit impact declarations for a work request.
 * Phase J: UI sends to API, never computes impact locally.
 */

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type ImpactSubjectType =
  | "TEAM"
  | "DEPARTMENT"
  | "PERSON"
  | "ROLE"
  | "DECISION_DOMAIN"
  | "WORK_REQUEST";

type ImpactType = "BLOCKED" | "DEPENDENT" | "INFORM" | "CONSULT";
type ImpactSeverity = "LOW" | "MEDIUM" | "HIGH";

type SubjectOption = {
  id: string;
  label: string;
};

// ============================================================================
// Config
// ============================================================================

const impactTypeInfo: Record<ImpactType, { label: string; description: string }> = {
  BLOCKED: {
    label: "Blocked",
    description: "This work cannot complete unless the subject acts or changes",
  },
  DEPENDENT: {
    label: "Dependent",
    description: "The subject's work or outcome depends on this work",
  },
  INFORM: {
    label: "Inform",
    description: "Subject should be informed if this changes",
  },
  CONSULT: {
    label: "Consult",
    description: "Subject should be consulted before changing this",
  },
};

const severityInfo: Record<ImpactSeverity, { label: string; color: string }> = {
  HIGH: { label: "High", color: "bg-red-100 text-red-800" },
  MEDIUM: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  LOW: { label: "Low", color: "bg-blue-100 text-blue-800" },
};

const subjectTypeLabels: Record<ImpactSubjectType, string> = {
  TEAM: "Team",
  DEPARTMENT: "Department",
  PERSON: "Person",
  ROLE: "Role",
  DECISION_DOMAIN: "Decision Domain",
  WORK_REQUEST: "Work Request",
};

// ============================================================================
// Component
// ============================================================================

type Props = {
  open: boolean;
  onClose: () => void;
  workRequestId: string;
  currentWorkRequestId: string; // For preventing self-reference
  onSuccess: (impactData?: unknown) => void;
};

export function AddImpactDrawer({
  open,
  onClose,
  workRequestId,
  currentWorkRequestId,
  onSuccess,
}: Props) {
  // Form state
  const [subjectType, setSubjectType] = useState<ImpactSubjectType>("TEAM");
  const [subjectId, setSubjectId] = useState("");
  const [roleType, setRoleType] = useState("");
  const [domainKey, setDomainKey] = useState("");
  const [impactType, setImpactType] = useState<ImpactType>("DEPENDENT");
  const [severity, setSeverity] = useState<ImpactSeverity>("MEDIUM");
  const [explanation, setExplanation] = useState("");

  // Subject options state
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subject options when type changes
  useEffect(() => {
    if (!open) return;

    const fetchOptions = async () => {
      setLoadingOptions(true);
      setSubjectId("");
      setRoleType("");
      setDomainKey("");
      setSubjectOptions([]);

      try {
        let options: SubjectOption[] = [];

        switch (subjectType) {
          case "TEAM": {
            const res = await fetch("/api/org/teams");
            if (res.ok) {
              const data = await res.json();
              options = (data.teams ?? []).map((t: { id: string; name: string }) => ({
                id: t.id,
                label: t.name,
              }));
            }
            break;
          }
          case "DEPARTMENT": {
            const res = await fetch("/api/org/departments");
            if (res.ok) {
              const data = await res.json();
              options = (data.departments ?? []).map((d: { id: string; name: string }) => ({
                id: d.id,
                label: d.name,
              }));
            }
            break;
          }
          case "PERSON": {
            const res = await fetch("/api/org/people");
            if (res.ok) {
              const data = await res.json();
              options = (data.people ?? []).map(
                (p: { id: string; name: string | null; email: string }) => ({
                  id: p.id,
                  label: p.name ?? p.email,
                })
              );
            }
            break;
          }
          case "DECISION_DOMAIN": {
            const res = await fetch("/api/org/decision/domains");
            if (res.ok) {
              const data = await res.json();
              options = (data.domains ?? []).map((d: { key: string; name: string }) => ({
                id: d.key,
                label: d.name,
              }));
            }
            break;
          }
          case "WORK_REQUEST": {
            const res = await fetch("/api/org/work/requests");
            if (res.ok) {
              const data = await res.json();
              options = (data.requests ?? [])
                .filter((r: { id: string }) => r.id !== currentWorkRequestId) // Exclude self
                .map((r: { id: string; title: string }) => ({
                  id: r.id,
                  label: r.title,
                }));
            }
            break;
          }
          case "ROLE":
            // Role uses free text, no options
            break;
        }

        setSubjectOptions(options);
      } catch (err: unknown) {
        console.error("Failed to fetch subject options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [subjectType, open, currentWorkRequestId]);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setSubjectType("TEAM");
      setSubjectId("");
      setRoleType("");
      setDomainKey("");
      setImpactType("DEPENDENT");
      setSeverity("MEDIUM");
      setExplanation("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // Build request body
      const body: Record<string, unknown> = {
        subjectType,
        impactType,
        severity,
        explanation: explanation.trim() || `Impact on ${subjectTypeLabels[subjectType]}`,
      };

      // Add subject identity based on type
      if (subjectType === "ROLE") {
        if (!roleType.trim()) {
          setError("Role type is required");
          return;
        }
        body.roleType = roleType.trim();
      } else if (subjectType === "DECISION_DOMAIN") {
        if (!domainKey) {
          setError("Decision domain is required");
          return;
        }
        body.domainKey = domainKey;
      } else {
        if (!subjectId) {
          setError(`${subjectTypeLabels[subjectType]} is required`);
          return;
        }
        body.subjectId = subjectId;
      }

      const res = await fetch(`/api/org/work/requests/${workRequestId}/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create impact");
      }

      // Pass returned impact data to avoid refetch
      onSuccess(data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    explanation.trim().length > 0 &&
    (subjectType === "ROLE"
      ? roleType.trim().length > 0
      : subjectType === "DECISION_DOMAIN"
      ? domainKey.length > 0
      : subjectId.length > 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Impact</SheetTitle>
          <SheetDescription>
            Declare who or what is affected if this work is delayed or changed.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Subject Type */}
          <div className="space-y-2">
            <Label>What type of thing is affected?</Label>
            <Select
              value={subjectType}
              onValueChange={(v) => setSubjectType(v as ImpactSubjectType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEAM">Team</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="PERSON">Person</SelectItem>
                <SelectItem value="ROLE">Role</SelectItem>
                <SelectItem value="DECISION_DOMAIN">Decision Domain</SelectItem>
                <SelectItem value="WORK_REQUEST">Another Work Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <Label>Which {subjectTypeLabels[subjectType].toLowerCase()}?</Label>
            {subjectType === "ROLE" ? (
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="e.g., Engineer, PM, Designer"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
              />
            ) : loadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select
                value={subjectType === "DECISION_DOMAIN" ? domainKey : subjectId}
                onValueChange={(v) =>
                  subjectType === "DECISION_DOMAIN"
                    ? setDomainKey(v)
                    : setSubjectId(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${subjectTypeLabels[subjectType].toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Impact Type */}
          <div className="space-y-2">
            <Label>How are they affected?</Label>
            <Select
              value={impactType}
              onValueChange={(v) => setImpactType(v as ImpactType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(impactTypeInfo) as ImpactType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col items-start">
                      <span>{impactTypeInfo[type].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {impactTypeInfo[impactType].description}
            </p>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>How severe is this impact?</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as ImpactSeverity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(severityInfo) as ImpactSeverity[]).map((sev) => (
                  <SelectItem key={sev} value={sev}>
                    <div className="flex items-center gap-2">
                      <Badge className={severityInfo[sev].color}>
                        {severityInfo[sev].label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Why are they affected?</Label>
            <Textarea
              placeholder="Brief explanation of the impact..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Impact
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
