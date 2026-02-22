// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

/**
 * Work Request Detail Client
 * 
 * Displays work request details with feasibility analysis.
 * Phase H: UI renders API output only; all ranking from server.
 * Phase J: Added impact section for blast radius visibility.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  UserPlus,
  XCircle,
  Users,
  Building2,
  User,
  Shield,
  Briefcase,
} from "lucide-react";
import { WorkFeasibilityPanel } from "./WorkFeasibilityPanel";
import { WorkCandidateList } from "./WorkCandidateList";
import { WorkImpactSection } from "./WorkImpactSection";
import { AddImpactDrawer } from "./AddImpactDrawer";
import { OrgPrimaryCta, OrgSecondaryCta } from "@/components/org/ui/OrgCtaButton";
import { useToast } from "@/components/ui/use-toast";
import {
  deepLinkForDecisionDomain,
  deepLinkForCapacityIssues,
  deepLinkForDecisionIssues,
  deepLinkForResponsibilityIssues,
} from "@/lib/org/issues/deepLinks";
import type { WorkFeasibilityResult } from "@/lib/org/work/types";
import type { WorkImpactResolution } from "@/lib/org/impact/types";
import { WorkMissingRequirements } from "./WorkMissingRequirements";

type WorkRequest = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  desiredStart: string;
  desiredEnd: string;
  effortType: string;
  effortHours: number | null;
  effortTShirt: string | null;
  estimatedEffortHours: number;
  domainType: string;
  domainId: string | null;
  requiredRoleType: string | null;
  requiredSeniority: string | null;
  status: string;
  isProvisional: boolean;
  closedAt: string | null;
  createdAt: string;
};

const priorityColors: Record<string, string> = {
  P0: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  P1: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  P2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  P3: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

// Phase J: Use canonical WorkImpactResolution type

// ---------------------------------------------------------------------------
// Recommendation action config (shared with WorkFeasibilityPanel)
// ---------------------------------------------------------------------------
const actionConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  PROCEED: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Proceed",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/50",
  },
  REASSIGN: {
    icon: <ArrowRight className="h-4 w-4" />,
    label: "Reassign",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  DELAY: {
    icon: <Clock className="h-4 w-4" />,
    label: "Delay",
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/50",
  },
  REQUEST_SUPPORT: {
    icon: <UserPlus className="h-4 w-4" />,
    label: "Request Support",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/50",
  },
};

// Deep-link actions per recommendation action
function getRecommendationLinks(
  action: string,
  domainKey?: string | null
): { label: string; href: string }[] {
  switch (action) {
    case "PROCEED":
      return [
        {
          label: "Confirm decision coverage",
          href: domainKey
            ? deepLinkForDecisionDomain(domainKey)
            : deepLinkForDecisionIssues(),
        },
        { label: "Review candidates", href: "#candidates" },
      ];
    case "DELAY":
      return [
        { label: "Review capacity gaps", href: deepLinkForCapacityIssues() },
        { label: "Set missing capacity data", href: "/org/directory" },
      ];
    case "REASSIGN":
      return [
        { label: "Review candidates", href: "#candidates" },
        {
          label: "Adjust decision domain",
          href: domainKey
            ? deepLinkForDecisionDomain(domainKey)
            : deepLinkForDecisionIssues(),
        },
      ];
    case "REQUEST_SUPPORT":
      return [
        { label: "Create/assign required role", href: "/org/structure" },
        {
          label: "Check responsibility coverage",
          href: deepLinkForResponsibilityIssues(),
        },
      ];
    default:
      return [{ label: "Review configuration", href: "/org/admin/health" }];
  }
}

export function WorkRequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<WorkRequest | null>(null);
  const [feasibility, setFeasibility] = useState<WorkFeasibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);

  // W1.5: Recommendation Closure state
  const hasLoggedRef = useRef(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);

  // O1: Onboarding completion state
  const [completing, setCompleting] = useState(false);
  
  // Phase J: Impact state (using canonical type)
  const [impactData, setImpactData] = useState<WorkImpactResolution | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [addImpactOpen, setAddImpactOpen] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/org/work/requests/${id}`);
      if (!response.ok) throw new Error("Failed to fetch work request");
      const data = await response.json();
      setRequest(data.request);
      setError(null);

      // Fetch feasibility and impact for OPEN requests
      // O1: Provisional work still logs for diagnostic memory, but logging is kept
      // to first-mount only via the ref guard in fetchFeasibility.
      // Note: Provisional recommendation logs do NOT count toward unacknowledged
      // work metrics — the acknowledge guard prevents acknowledgement, and
      // WorkOverviewCard already filters by latestAcknowledgedAt.
      if (data.request.status === "OPEN") {
        fetchFeasibility({ log: true });
        fetchImpact();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeasibility = useCallback(async (options?: { log?: boolean }) => {
    try {
      setFeasibilityLoading(true);
      // Log on first mount only (ref guard prevents re-renders / StrictMode duplicates)
      const shouldLog = options?.log && !hasLoggedRef.current;
      const logParam = shouldLog ? "?log=true" : "";
      const response = await fetch(`/api/org/work/requests/${id}/feasibility${logParam}`);
      if (!response.ok) throw new Error("Failed to fetch feasibility");
      const data = await response.json();
      setFeasibility(data);
      if (shouldLog) {
        hasLoggedRef.current = true;
      }
    } catch (err) {
      console.error("Feasibility fetch error:", err);
    } finally {
      setFeasibilityLoading(false);
    }
  }, [id]);

  // Phase J: Fetch impact data
  const fetchImpact = async () => {
    try {
      setImpactLoading(true);
      const response = await fetch(`/api/org/work/requests/${id}/impact`);
      if (!response.ok) throw new Error("Failed to fetch impact");
      const data = await response.json();
      setImpactData(data);
    } catch (err) {
      console.error("Impact fetch error:", err);
    } finally {
      setImpactLoading(false);
    }
  };

  // Phase J: Delete impact handler
  const handleDeleteImpact = async (impactId: string) => {
    try {
      const response = await fetch(`/api/org/work/requests/${id}/impact/${impactId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete impact");
      const data = await response.json();
      // Update with fresh resolution from response
      setImpactData(data);
    } catch (err) {
      console.error("Delete impact error:", err);
    }
  };

  const handleClose = async () => {
    try {
      const response = await fetch(`/api/org/work/requests/${id}/close`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to close request");
      fetchRequest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  // W1.5: Acknowledge recommendation
  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      const response = await fetch(`/api/org/work/requests/${id}/acknowledge`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to acknowledge");
      setAcknowledged(true);
      toast({ description: "Recommendation acknowledged" });
    } catch {
      toast({
        description: "Failed to acknowledge recommendation",
        variant: "destructive",
      });
    } finally {
      setAcknowledging(false);
    }
  };

  // O1: Complete onboarding — convert provisional + mark onboarding done
  const handleCompleteOnboarding = async () => {
    if (!request?.isProvisional || completing) return;
    setCompleting(true);
    try {
      // Step 1: Convert provisional to normal
      const patchRes = await fetch(`/api/org/work/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isProvisional: false }),
      });
      if (!patchRes.ok) {
        throw new Error("Failed to convert work request");
      }

      // Step 2: Mark onboarding complete
      const completeRes = await fetch("/api/org/onboarding/complete", {
        method: "POST",
      });
      if (!completeRes.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast({ description: "Setup complete! Your org is ready." });
      router.push("/org");
    } catch {
      toast({
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  // O1: Visibility-based re-fetch for provisional work requests
  useEffect(() => {
    if (!request?.isProvisional) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchFeasibility(); // no logging on re-fetch
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [request?.isProvisional, fetchFeasibility]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-medium">{error ?? "Work request not found"}</p>
            <Button variant="outline" onClick={() => router.push("/org/work")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Requests
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/org/work")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Work Requests
      </Button>

      {/* Request header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={priorityColors[request.priority]}>
                  {request.priority}
                </Badge>
                {request.status === "CLOSED" && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Closed
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{request.title}</CardTitle>
              {request.description && (
                <CardDescription className="text-base">
                  {request.description}
                </CardDescription>
              )}
            </div>
            {request.status === "OPEN" && (
              <Button variant="outline" onClick={handleClose}>
                <XCircle className="h-4 w-4 mr-2" />
                Close Request
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Time Window</p>
              <p className="font-medium">
                {formatDate(request.desiredStart)} - {formatDate(request.desiredEnd)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Effort</p>
              <p className="font-medium">
                {request.effortType === "HOURS"
                  ? `${request.effortHours}h`
                  : `${request.effortTShirt} (${request.estimatedEffortHours}h)`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Domain</p>
              <p className="font-medium">{request.domainType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requirements</p>
              <p className="font-medium">
                {[request.requiredRoleType, request.requiredSeniority]
                  .filter(Boolean)
                  .join(", ") || "None specified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O1: Provisional staleness warning */}
      {request.isProvisional && (() => {
        const createdMs = new Date(request.createdAt).getTime();
        const daysSinceCreation = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 14) return null;
        return (
          <Card className="border-amber-600/50 bg-amber-950/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>This onboarding work hasn&apos;t been completed yet. Complete setup or close to continue.</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* O1: Completion banner — provisional + PROCEED + no missing requirements */}
      {request.isProvisional &&
        !feasibilityLoading &&
        feasibility?.recommendation?.action === "PROCEED" &&
        !feasibility?.missingRequirements && (
          <Card className="border-green-600/50 bg-green-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-300">
                      Your org is now ready to reason about work.
                    </p>
                    <p className="text-xs text-green-400/70">
                      All required configuration is in place.
                    </p>
                  </div>
                </div>
                <OrgPrimaryCta
                  size="sm"
                  disabled={completing}
                  onClick={handleCompleteOnboarding}
                >
                  {completing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Complete setup
                </OrgPrimaryCta>
              </div>
            </CardContent>
          </Card>
        )}

      {/* W1.5 / O1: Recommendation Action Bar */}
      {request.status === "OPEN" && (() => {
        const action = feasibility?.recommendation?.action;
        const config = action ? actionConfig[action] : null;
        const hasRecommendation = !feasibilityLoading && feasibility && config;
        const domainKey = feasibility?.escalationContacts?.domainKey ?? null;
        const links = action
          ? getRecommendationLinks(action, domainKey)
          : [{ label: "Review configuration", href: "/org/admin/health" }];

        return (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: badge + reason + timestamp */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {feasibilityLoading ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Evaluating...
                      </Badge>
                    ) : hasRecommendation ? (
                      <Badge className={`gap-1 ${config.bgColor} ${config.color} border-0`}>
                        {config.icon}
                        {config.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Unable to evaluate
                      </Badge>
                    )}
                    {!request.isProvisional && acknowledged && (
                      <Badge variant="outline" className="gap-1 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Acknowledged
                      </Badge>
                    )}
                    {request.isProvisional && (
                      <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400 border-amber-400 dark:border-amber-600">
                        Needs setup
                      </Badge>
                    )}
                  </div>
                  {hasRecommendation && feasibility.recommendation.explanation[0] && (
                    <p className="text-sm text-muted-foreground truncate">
                      {feasibility.recommendation.explanation[0]}
                    </p>
                  )}
                  {hasRecommendation && feasibility.responseMeta?.generatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last evaluated: {new Date(feasibility.responseMeta.generatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Right: CTAs */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <OrgSecondaryCta
                    size="sm"
                    onClick={() => setShowNextSteps((v) => !v)}
                  >
                    What should I do next?
                  </OrgSecondaryCta>
                  {request.isProvisional ? (
                    // O1: Provisional mode — scroll to missing requirements
                    <OrgPrimaryCta
                      size="sm"
                      disabled={!hasRecommendation}
                      onClick={() => {
                        const el = document.getElementById("missing-requirements");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Help me answer this
                    </OrgPrimaryCta>
                  ) : (
                    // Normal mode — acknowledge
                    <OrgPrimaryCta
                      size="sm"
                      disabled={!hasRecommendation || acknowledged || acknowledging}
                      onClick={handleAcknowledge}
                    >
                      {acknowledging ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : acknowledged ? (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      ) : null}
                      {acknowledged ? "Acknowledged" : "Acknowledge"}
                    </OrgPrimaryCta>
                  )}
                </div>
              </div>

              {/* Expandable next-steps */}
              {showNextSteps && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Suggested next steps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {links.map((link) =>
                      link.href.startsWith("#") ? (
                        <Button
                          key={link.label}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            const el = document.getElementById(link.href.slice(1));
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          {link.label}
                        </Button>
                      ) : (
                        <Button
                          key={link.label}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          asChild
                        >
                          <Link href={link.href}>
                            {link.label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* O1: Missing Requirements section (only for provisional) */}
      {request.isProvisional && !feasibilityLoading && feasibility && (
        <WorkMissingRequirements
          missingRequirements={feasibility.missingRequirements}
          workRequestId={id}
        />
      )}

      {/* Feasibility section (only for OPEN requests) */}
      {request.status === "OPEN" && (
        <>
          {feasibilityLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing staffing feasibility...</span>
                </div>
              </CardContent>
            </Card>
          ) : feasibility ? (
            <>
              {/* Feasibility panel */}
              <WorkFeasibilityPanel feasibility={feasibility} />

              {/* Phase P: "If This Is Delayed..." guidance section */}
              {impactData && impactData.impacts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>If This Is Delayed...</CardTitle>
                    <CardDescription>
                      Entities that will be affected if this work is delayed or changed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Group by subject type */}
                      {Object.entries(impactData.bySubjectType).map(([subjectType, impacts]) => {
                        const typedImpacts = impacts as typeof impactData.impacts;
                        if (typedImpacts.length === 0) return null;

                        const getSubjectIcon = (type: string) => {
                          switch (type) {
                            case "TEAM":
                              return <Users className="h-4 w-4" />;
                            case "DEPARTMENT":
                              return <Building2 className="h-4 w-4" />;
                            case "PERSON":
                              return <User className="h-4 w-4" />;
                            case "DECISION_DOMAIN":
                              return <Shield className="h-4 w-4" />;
                            case "WORK_REQUEST":
                              return <Briefcase className="h-4 w-4" />;
                            default:
                              return <AlertCircle className="h-4 w-4" />;
                          }
                        };

                        const getSeverityColor = (severity: string) => {
                          switch (severity) {
                            case "HIGH":
                              return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                            case "MEDIUM":
                              return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
                            case "LOW":
                              return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                            default:
                              return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                          }
                        };

                        const getImpactTypeLabel = (type: string) => {
                          switch (type) {
                            case "BLOCKED":
                              return "Blocked";
                            case "DELAYED":
                              return "Delayed";
                            case "BLOCKING":
                              return "Blocking";
                            default:
                              return type;
                          }
                        };

                        return (
                          <div key={subjectType} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {getSubjectIcon(subjectType)}
                              <span>{subjectType.replace("_", " ")}</span>
                              <Badge variant="secondary" className="ml-auto">
                                {typedImpacts.length}
                              </Badge>
                            </div>
                            <div className="space-y-1 pl-6">
                              {typedImpacts.map((impact) => (
                                <div
                                  key={impact.impactKey}
                                  className="flex items-center justify-between text-sm py-1"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{impact.subjectLabel}</span>
                                    <Badge className={getSeverityColor(impact.severity)}>
                                      {impact.severity}
                                    </Badge>
                                    <Badge variant="outline">
                                      {getImpactTypeLabel(impact.impactType)}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Candidate list */}
              <div id="candidates">
                <WorkCandidateList
                  candidates={feasibility.candidates}
                  estimatedEffortHours={feasibility.estimatedEffortHours}
                />
              </div>

              {/* Response meta (collapsible) */}
              <Collapsible open={showMeta} onOpenChange={setShowMeta}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Why this answer?
                        </CardTitle>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            showMeta ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Generated At</p>
                        <p className="text-sm font-mono">
                          {new Date(feasibility.responseMeta.generatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Assumptions ID</p>
                        <p className="text-sm font-mono">
                          {feasibility.responseMeta.assumptionsId}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data Assumptions</p>
                        <ul className="text-sm font-mono list-disc list-inside">
                          {feasibility.responseMeta.dataAssumptions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Thresholds Used</p>
                        <p className="text-sm font-mono">
                          minCapacity: {feasibility.thresholdsUsed.minCapacityForWork}h,
                          overallocation: {feasibility.thresholdsUsed.overallocationThreshold * 100}%
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>Evidence v{feasibility.responseMeta.evidenceVersion}</span>
                        <span>Semantics v{feasibility.responseMeta.semanticsVersion}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchFeasibility()}
                        disabled={feasibilityLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${feasibilityLoading ? "animate-spin" : ""}`} />
                        Refresh Analysis
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <p>Unable to load feasibility analysis</p>
                  <Button variant="outline" onClick={() => fetchFeasibility()}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase J: Impact section */}
          <WorkImpactSection
            impactData={impactData}
            loading={impactLoading}
            onAddImpact={() => setAddImpactOpen(true)}
            onDeleteImpact={handleDeleteImpact}
          />

          {/* Phase J: Add impact drawer */}
          <AddImpactDrawer
            open={addImpactOpen}
            onClose={() => setAddImpactOpen(false)}
            workRequestId={id}
            currentWorkRequestId={id}
            onSuccess={(impactData) => {
              // Apply returned state instead of refetching
              if (impactData && typeof impactData === "object" && "workRequestId" in impactData) {
                setImpactData(impactData as WorkImpactResolution);
              } else {
                fetchImpact(); // Fallback if no data returned
              }
            }}
          />
        </>
      )}
    </div>
  );
}
