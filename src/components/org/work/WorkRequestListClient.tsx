"use client";

/**
 * Work Request List Client
 * 
 * Displays list of work requests with filtering and create functionality.
 * Phase H: UI renders API output only; no ranking logic in client.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { CreateWorkRequestDrawer } from "./CreateWorkRequestDrawer";

type WorkRequestSummary = {
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
  // W1.5: Latest recommendation state
  latestRecommendationAction: string | null;
  latestAcknowledgedAt: string | null;
};

// W1.5: Recommendation pill config
const recommendationPillConfig: Record<string, { label: string; className: string }> = {
  PROCEED: {
    label: "Proceed",
    className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  DELAY: {
    label: "Delay",
    className: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  REASSIGN: {
    label: "Reassign",
    className: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  REQUEST_SUPPORT: {
    label: "Request Support",
    className: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  },
};

const priorityColors: Record<string, string> = {
  P0: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  P1: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  P2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  P3: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const priorityLabels: Record<string, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Low",
};

export function WorkRequestListClient() {
  const router = useRouter();
  const [requests, setRequests] = useState<WorkRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/org/work/requests?${params}`);
      if (!response.ok) throw new Error("Failed to fetch work requests");

      const data = await response.json();
      setRequests(data.requests ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchRequests();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEffort = (req: WorkRequestSummary) => {
    if (req.effortType === "HOURS") {
      return `${req.effortHours}h`;
    }
    return `${req.effortTShirt} (${req.estimatedEffortHours}h)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading work requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </span>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!error && requests.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No work requests</p>
              <p className="text-sm mt-1">Create a new request to get started with capacity planning.</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Work Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request list */}
      {requests.length > 0 && (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card
              key={req.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/org/work/${req.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[req.priority]}>
                        {priorityLabels[req.priority] ?? req.priority}
                      </Badge>
                      {req.status === "CLOSED" && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Closed
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{req.title}</CardTitle>
                  </div>
                  <div className="flex items-start gap-3">
                    {/* W1.5: Recommendation pill */}
                    {(() => {
                      const pill = req.latestRecommendationAction
                        ? recommendationPillConfig[req.latestRecommendationAction]
                        : null;
                      return (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-xs whitespace-nowrap ${
                              pill?.className ?? "bg-muted/50 text-muted-foreground border-muted"
                            }`}
                          >
                            {pill?.label ?? "Not evaluated"}
                          </Badge>
                          {req.latestAcknowledgedAt && (
                            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })()}
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{formatDate(req.desiredStart)} - {formatDate(req.desiredEnd)}</div>
                      <div className="font-medium text-foreground">{formatEffort(req)}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Domain: {req.domainType}</span>
                  {req.requiredRoleType && <span>Role: {req.requiredRoleType}</span>}
                  {req.requiredSeniority && <span>Seniority: {req.requiredSeniority}</span>}
                </div>
                {req.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {req.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create drawer */}
      <CreateWorkRequestDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
