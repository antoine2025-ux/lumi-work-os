"use client";

import { useEffect, useRef, useMemo } from "react";
import { CheckCircle2, Users, Building2, UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
};

type OrgSetupGuidePanelProps = {
  open: boolean;
  onClose: () => void;
};

export function OrgSetupGuidePanel({ open, onClose }: OrgSetupGuidePanelProps) {
  const orgUrl = useOrgUrl();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);

  // Determine completion status for each step
  const stepStatus = useMemo(() => {
    const overview = overviewQ.data;
    // Support both { ok, data: { people } } and { people } response shapes
    const people = ((peopleQ.data as Record<string, unknown>)?.data as Record<string, unknown>)?.people as Array<{ teamId?: string | null }> ?? (peopleQ.data as Record<string, unknown>)?.people as Array<{ teamId?: string | null }> ?? [];

    if (!overview) {
      return {
        addPeople: false,
        createTeam: false,
        assignPeople: false,
        assignOwnership: false,
      };
    }

    const { summary, readiness } = overview;
    const peopleCount = summary.peopleCount ?? 0;
    const teamCount = summary.teamCount ?? 0;
    const unownedEntities = summary.unownedEntities ?? 0;

    // Step 1: Add people - complete if people exist
    const addPeople = peopleCount > 0 || readiness.people_added === true;

    // Step 2: Create a team - complete if teams exist
    const createTeam = teamCount > 0 || readiness.structure_defined === true;

    // Step 3: Assign people to teams - complete if people have teams assigned
    // Check if any people have a teamId assigned
    const assignPeople = 
      addPeople && 
      createTeam && 
      people.some((p) => p.teamId !== null && p.teamId !== undefined);

    // Step 4: Assign ownership - complete if no unowned entities
    const assignOwnership = unownedEntities === 0 || readiness.ownership_assigned === true;

    return {
      "add-people": addPeople,
      "create-team": createTeam,
      "assign-people": assignPeople,
      "assign-ownership": assignOwnership,
    };
  }, [overviewQ.data, peopleQ.data]);

  const STEPS: Step[] = [
    {
      id: "add-people",
      title: "Add people",
      description: "Add people to your organization",
      href: orgUrl.newPerson,
      icon: Users,
    },
    {
      id: "create-team",
      title: "Create a team",
      description: "Create your first team",
      href: `${orgUrl.structure}?tab=teams`,
      icon: Building2,
    },
    {
      id: "assign-people",
      title: "Assign people to teams",
      description: "Assign people to their teams",
      href: orgUrl.directory,
      icon: UserPlus,
    },
    {
      id: "assign-ownership",
      title: "Assign ownership",
      description: "Assign owners to teams and departments",
      href: orgUrl.ownership,
      icon: ShieldCheck,
    },
  ];

  // Focus management: focus close button when drawer opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard handling: ESC key closes drawer
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const isLoading = overviewQ.loading || peopleQ.loading;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/40 transition-opacity duration-150 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
    >
      <div
        className={`h-full w-full max-w-md border-l border-border bg-background shadow-xl transition-all duration-150 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground" id="setup-guide-title">
                Org setup
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Complete these steps to set up your organization.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-slate-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              aria-label="Close setup guide"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[13px] text-muted-foreground">Loading…</div>
            </div>
          ) : (
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const isComplete = stepStatus[step.id as keyof typeof stepStatus];

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      isComplete
                        ? "border-border bg-background/40"
                        : "border-border bg-background/60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isComplete ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={cn(
                                "text-[14px] font-semibold",
                                isComplete ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {step.title}
                            </h3>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">
                              {step.description}
                            </p>
                          </div>

                          {/* CTA button */}
                          {!isComplete && (
                            <Link href={step.href} onClick={onClose}>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-[11px] font-medium bg-primary hover:bg-primary/90 text-foreground shrink-0"
                              >
                                Start
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

