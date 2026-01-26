"use client";

/**
 * Work Request Detail Client
 * 
 * Displays work request details with feasibility analysis.
 * Phase H: UI renders API output only; all ranking from server.
 * Phase J: Added impact section for blast radius visibility.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Timer,
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
import type { WorkFeasibilityResult } from "@/lib/org/work/types";
import type { WorkImpactResolution } from "@/lib/org/impact/types";

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

export function WorkRequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<WorkRequest | null>(null);
  const [feasibility, setFeasibility] = useState<WorkFeasibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);
  
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
      if (data.request.status === "OPEN") {
        fetchFeasibility();
        fetchImpact();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeasibility = async () => {
    try {
      setFeasibilityLoading(true);
      const response = await fetch(`/api/org/work/requests/${id}/feasibility`);
      if (!response.ok) throw new Error("Failed to fetch feasibility");
      const data = await response.json();
      setFeasibility(data);
    } catch (err) {
      console.error("Feasibility fetch error:", err);
    } finally {
      setFeasibilityLoading(false);
    }
  };

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
              <WorkCandidateList
                candidates={feasibility.candidates}
                estimatedEffortHours={feasibility.estimatedEffortHours}
              />

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
                        onClick={fetchFeasibility}
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
                  <Button variant="outline" onClick={fetchFeasibility}>
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
