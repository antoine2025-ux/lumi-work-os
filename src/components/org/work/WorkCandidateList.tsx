"use client";

/**
 * Work Candidate List
 * 
 * Displays ranked candidates with capacity summaries.
 * Phase H: UI renders pre-ranked candidates from API; no client-side ranking.
 * Phase K: Added alignment chip display.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckCircle2, User, AlertCircle, ChevronDown, ChevronUp, Target } from "lucide-react";

type AlignmentResult = "ALIGNED" | "PARTIAL" | "MISALIGNED" | "UNKNOWN";

type Candidate = {
  personId: string;
  personName: string;
  rank: number;
  whyChosen: string[];
  effectiveCapacitySummary: {
    weeklyCapacityHours: number;
    contractedHoursForWindow: number;
    availabilityFactor: number;
    allocatedHours: number;
    effectiveAvailableHours: number;
  };
  confidence: { score: number; explanation: string[] };
  // Phase K: Alignment data
  alignment?: AlignmentResult | null;
  alignmentExplanation?: string[];
};

// Alignment badge styling
function AlignmentChip({ alignment }: { alignment: AlignmentResult | null | undefined }) {
  if (!alignment) return null;

  const styles: Record<AlignmentResult, { bg: string; text: string; label: string }> = {
    ALIGNED: {
      bg: "bg-blue-100 dark:bg-blue-900",
      text: "text-blue-700 dark:text-blue-300",
      label: "Aligned",
    },
    PARTIAL: {
      bg: "bg-yellow-100 dark:bg-yellow-900",
      text: "text-yellow-700 dark:text-yellow-300",
      label: "Partial",
    },
    MISALIGNED: {
      bg: "bg-red-100 dark:bg-red-900",
      text: "text-red-700 dark:text-red-300",
      label: "Misaligned",
    },
    UNKNOWN: {
      bg: "bg-gray-100 dark:bg-muted",
      text: "text-gray-600 dark:text-muted-foreground",
      label: "Unknown",
    },
  };

  const style = styles[alignment];

  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} text-xs`}>
      <Target className="h-3 w-3 mr-1" />
      {style.label}
    </Badge>
  );
}

// Alignment explanation collapsible
function AlignmentExplanation({ explanation }: { explanation: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>Why this alignment?</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
          {explanation.map((reason, i) => (
            <p key={i}>• {reason}</p>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkCandidateList({
  candidates,
  estimatedEffortHours,
}: {
  candidates: Candidate[];
  estimatedEffortHours: number;
}) {
  if (candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center text-muted-foreground">
            <User className="h-12 w-12 opacity-50" />
            <p>No candidates found matching the criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine viable candidates (from whyChosen - check if "Available with" is in whyChosen)
  const getViability = (candidate: Candidate) => {
    return candidate.whyChosen.some((w) => w.includes("Available with"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Candidates ({candidates.length})</span>
          <span className="text-sm font-normal text-muted-foreground">
            Need: {estimatedEffortHours}h
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidates.map((candidate) => {
          const capacity = candidate.effectiveCapacitySummary;
          const isViable = getViability(candidate);
          const canFullyCover = capacity.effectiveAvailableHours >= estimatedEffortHours;
          const availabilityPercent = Math.round(capacity.availabilityFactor * 100);
          const allocationPercent =
            capacity.contractedHoursForWindow > 0
              ? Math.round(
                  (capacity.allocatedHours / capacity.contractedHoursForWindow) * 100
                )
              : 0;

          return (
            <div
              key={candidate.personId}
              className={`p-4 rounded-lg border ${
                isViable
                  ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      candidate.rank <= 3
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {candidate.rank}
                  </div>
                  <div>
                    <p className="font-medium">{candidate.personName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isViable ? (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Viable
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not viable
                        </Badge>
                      )}
                      {canFullyCover && isViable && (
                        <Badge variant="outline" className="text-green-700 dark:text-green-300">
                          Can fully cover
                        </Badge>
                      )}
                      {/* Phase K: Alignment chip */}
                      <AlignmentChip alignment={candidate.alignment} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {capacity.effectiveAvailableHours.toFixed(1)}h
                  </p>
                  <p className="text-sm text-muted-foreground">available</p>
                </div>
              </div>

              {/* Capacity breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Contracted</p>
                  <p className="text-sm font-medium">
                    {capacity.contractedHoursForWindow.toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Availability</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={availabilityPercent}
                      className="h-2 flex-1"
                    />
                    <span className="text-sm font-medium">{availabilityPercent}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Already Allocated</p>
                  <p className="text-sm font-medium">
                    {capacity.allocatedHours.toFixed(1)}h ({allocationPercent}%)
                  </p>
                </div>
              </div>

              {/* Why chosen */}
              <div className="flex flex-wrap gap-1">
                {candidate.whyChosen.map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>

              {/* Phase K: Alignment explanation collapsible */}
              {candidate.alignment && candidate.alignmentExplanation && candidate.alignmentExplanation.length > 0 && (
                <AlignmentExplanation explanation={candidate.alignmentExplanation} />
              )}

              {/* Confidence */}
              <div className="mt-2 text-xs text-muted-foreground">
                Confidence: {Math.round(candidate.confidence.score * 100)}%
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
