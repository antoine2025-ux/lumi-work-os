/**
 * Person Availability Card
 * 
 * Displays employment status and availability facts for a person.
 * Provides edit access to employment status and availability windows.
 * 
 * No interpretation - only factual display.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Pencil, Plus, Calendar, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EditEmploymentStatusDialog } from "./EditEmploymentStatusDialog";
import { AvailabilityWindowsEditor } from "./AvailabilityWindowsEditor";

type PersonAvailabilityCardProps = {
  personId: string;
  canEdit?: boolean;
  onAvailabilityChanged?: () => void; // Callback to notify parent of availability changes
};

function EmploymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
          Active
        </Badge>
      );
    case "ON_LEAVE":
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
          On Leave
        </Badge>
      );
    case "TERMINATED":
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
          Terminated
        </Badge>
      );
    case "CONTRACTOR":
      return (
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          Contractor
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Unknown
        </Badge>
      );
  }
}

function AvailabilityLabelBadge({ label }: { label: string }) {
  switch (label) {
    case "Available":
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
          Available
        </Badge>
      );
    case "Limited":
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
          Limited
        </Badge>
      );
    case "Unavailable":
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
          Unavailable
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Unknown
        </Badge>
      );
  }
}

function formatReason(reason: string | null): string {
  if (!reason) return "";
  const labels: Record<string, string> = {
    VACATION: "Vacation",
    SICK_LEAVE: "Sick Leave",
    PARENTAL_LEAVE: "Parental Leave",
    SABBATICAL: "Sabbatical",
    JURY_DUTY: "Jury Duty",
    BEREAVEMENT: "Bereavement",
    TRAINING: "Training",
    OTHER: "Other",
  };
  return labels[reason] ?? reason;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString();
}

// Quick set availability type and fraction mapping
type QuickSetType = "available" | "limited" | "unavailable";
const QUICK_SET_CONFIG: Record<QuickSetType, { type: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE"; fraction: number }> = {
  available: { type: "AVAILABLE", fraction: 1 },
  limited: { type: "PARTIAL", fraction: 0.5 },
  unavailable: { type: "UNAVAILABLE", fraction: 0 },
};

export function PersonAvailabilityCard({ personId, canEdit = false, onAvailabilityChanged }: PersonAvailabilityCardProps) {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editEmploymentOpen, setEditEmploymentOpen] = useState(false);
  const [editWindowsOpen, setEditWindowsOpen] = useState(false);
  const [quickSetLoading, setQuickSetLoading] = useState<QuickSetType | null>(null);

  const derivedQ = useOrgQuery(
    () => OrgApi.getPersonDerivedAvailability(personId),
    [personId, refreshKey]
  );

  const windowsQ = useOrgQuery(
    () => OrgApi.getPersonAvailabilityWindows(personId),
    [personId, refreshKey]
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    // Notify parent component to refetch person data (for badge update)
    onAvailabilityChanged?.();
  };

  /**
   * Quick set availability with upsert guard:
   * - Find existing open window (endDate == null)
   * - If exists, update it
   * - Otherwise, create new open window
   */
  const handleQuickSet = async (quickType: QuickSetType) => {
    if (quickSetLoading) return;

    const config = QUICK_SET_CONFIG[quickType];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    setQuickSetLoading(quickType);

    try {
      const windows = windowsQ.data?.windows ?? [];
      // Find existing open window (no end date)
      const openWindow = windows.find((w) => !w.endDate);

      if (openWindow) {
        // Update existing open window
        await OrgApi.updateAvailabilityWindow(personId, openWindow.id, {
          type: config.type,
          fraction: config.fraction,
          startDate: today,
          endDate: null,
        });
      } else {
        // Create new open window
        await OrgApi.createAvailabilityWindow(personId, {
          type: config.type,
          fraction: config.fraction,
          startDate: today,
          endDate: null,
        });
      }

      handleRefresh();
    } catch (error) {
      console.error("[PersonAvailabilityCard] Quick set failed:", error);
      toast({
        title: "Failed to update availability",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setQuickSetLoading(null);
    }
  };

  if (derivedQ.loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (derivedQ.error || !derivedQ.data?.derived) {
    // Log error details for debugging (dev only)
    if (process.env.NODE_ENV !== "production" && derivedQ.error) {
      console.error("[PersonAvailabilityCard] Failed to load derived availability:", derivedQ.error);
    }

    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Availability data could not be loaded.
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const derived = derivedQ.data.derived;
  const windows = windowsQ.data?.windows ?? [];

  return (
    <>
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">Availability</CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditEmploymentOpen(true)}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Employment Status */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Employment Status
            </div>
            <EmploymentStatusBadge status={derived.employmentStatus} />
          </div>

          {/* Derived Availability */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Availability
            </div>
            <div className="flex items-center gap-2">
              <AvailabilityLabelBadge label={derived.label} />
              {derived.fraction !== 1 && derived.fraction !== 0 && (
                <span className="text-xs text-muted-foreground">
                  ({Math.round(derived.fraction * 100)}%)
                </span>
              )}
            </div>
          </div>

          {/* Quick Set Actions */}
          {canEdit && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                Quick Set
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!quickSetLoading}
                  onClick={() => handleQuickSet("available")}
                  className="h-7 px-2.5 text-xs bg-transparent border-green-500/30 text-green-300 hover:bg-green-500/10 hover:text-green-200"
                >
                  {quickSetLoading === "available" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Available"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!quickSetLoading}
                  onClick={() => handleQuickSet("limited")}
                  className="h-7 px-2.5 text-xs bg-transparent border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                >
                  {quickSetLoading === "limited" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Limited"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!quickSetLoading}
                  onClick={() => handleQuickSet("unavailable")}
                  className="h-7 px-2.5 text-xs bg-transparent border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                >
                  {quickSetLoading === "unavailable" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Unavailable"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Reason if not available */}
          {derived.reason && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Reason
              </div>
              <div className="text-xs text-muted-foreground">{formatReason(derived.reason)}</div>
            </div>
          )}

          {/* Expected Return */}
          {derived.expectedReturnDate && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Expected Return
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {formatDate(derived.expectedReturnDate)}
              </div>
            </div>
          )}

          {/* Availability Windows */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Availability Windows ({windows.length})
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditWindowsOpen(true)}
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {windows.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No windows defined</div>
            ) : (
              <div className="space-y-2">
                {windows.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-muted-foreground">
                        {formatDate(w.startDate)}
                        {w.endDate && ` – ${formatDate(w.endDate)}`}
                      </div>
                      <div className="text-muted-foreground">
                        {w.type === "PARTIAL" && w.fraction !== null
                          ? `${Math.round(w.fraction * 100)}% capacity`
                          : w.type === "UNAVAILABLE"
                          ? "Unavailable"
                          : "Available"}
                        {w.reason && ` • ${formatReason(w.reason)}`}
                      </div>
                    </div>
                  </div>
                ))}
                {windows.length > 3 && (
                  <button
                    onClick={() => setEditWindowsOpen(true)}
                    className="text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    +{windows.length - 3} more
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Computed timestamp */}
          <div className="pt-2 text-[10px] text-slate-600">
            Computed {new Date(derived.computedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Employment Status Dialog */}
      <EditEmploymentStatusDialog
        open={editEmploymentOpen}
        onOpenChange={setEditEmploymentOpen}
        personId={personId}
        currentStatus={derived.employmentStatus}
        onSaved={handleRefresh}
      />

      {/* Availability Windows Editor */}
      <AvailabilityWindowsEditor
        open={editWindowsOpen}
        onOpenChange={setEditWindowsOpen}
        personId={personId}
        windows={windows}
        onSaved={handleRefresh}
      />
    </>
  );
}

