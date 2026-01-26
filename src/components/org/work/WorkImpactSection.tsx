"use client";

/**
 * Work Impact Section
 *
 * Displays the "Affected if delayed" section for a work request.
 * Phase J: UI renders API output only; all resolution from server.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Eye,
  MessageSquare,
  Network,
  Plus,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";
import { ExplainabilityPanel } from "@/components/org/explainability/ExplainabilityPanel";

// ============================================================================
// Types
// ============================================================================

type ImpactConfidence = {
  score: number;
  factors: {
    explicitness: number;
    completeness: number;
    consistency: number;
  };
  explanation: string[];
};

type ResolvedImpact = {
  impactKey: string;
  subjectType: string;
  subjectId: string | null;
  subjectLabel: string;
  impactType: string;
  severity: string;
  explanation: string;
  source: "EXPLICIT" | "INFERRED";
  confidence: ImpactConfidence;
  inferenceRule?: string;
  explicitImpactId?: string;
};

import type { WorkImpactResolution } from "@/lib/org/impact/types";

// ============================================================================
// Config
// ============================================================================

const severityColors: Record<string, { badge: string; dot: string }> = {
  HIGH: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    dot: "bg-red-500",
  },
  MEDIUM: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    dot: "bg-yellow-500",
  },
  LOW: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    dot: "bg-blue-500",
  },
};

const impactTypeLabels: Record<string, { label: string; description: string }> = {
  BLOCKED: {
    label: "Blocked",
    description: "This work cannot complete unless the subject acts/changes",
  },
  DEPENDENT: {
    label: "Dependent",
    description: "The subject's work/outcome depends on this work",
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

const subjectTypeIcons: Record<string, React.ReactNode> = {
  TEAM: <Users className="h-4 w-4" />,
  DEPARTMENT: <Building2 className="h-4 w-4" />,
  PERSON: <User className="h-4 w-4" />,
  ROLE: <Zap className="h-4 w-4" />,
  DECISION_DOMAIN: <MessageSquare className="h-4 w-4" />,
  WORK_REQUEST: <Network className="h-4 w-4" />,
};

const subjectTypeLabels: Record<string, string> = {
  TEAM: "Teams",
  DEPARTMENT: "Departments",
  PERSON: "People",
  ROLE: "Roles",
  DECISION_DOMAIN: "Decision Domains",
  WORK_REQUEST: "Work Requests",
};

// ============================================================================
// Component
// ============================================================================

type Props = {
  impactData: WorkImpactResolution | null;
  loading?: boolean;
  onAddImpact?: () => void;
  onDeleteImpact?: (impactId: string) => void;
};

export function WorkImpactSection({
  impactData,
  loading = false,
  onAddImpact,
  onDeleteImpact,
}: Props) {
  const [showMeta, setShowMeta] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading impact analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!impactData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <p>Unable to load impact analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { impacts, summary, evidence, responseMeta } = impactData;

  // Group impacts for display
  const subjectTypes = [
    "TEAM",
    "DEPARTMENT",
    "PERSON",
    "ROLE",
    "DECISION_DOMAIN",
    "WORK_REQUEST",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Affected if Delayed
          </span>
          <div className="flex items-center gap-2">
            {summary.highestSeverity && (
              <Badge className={severityColors[summary.highestSeverity]?.badge}>
                {summary.highestSeverity} Impact
              </Badge>
            )}
            <Badge variant="outline">
              {summary.totalCount} affected
              {summary.inferredCount > 0 && ` (${summary.inferredCount} inferred)`}
            </Badge>
            {onAddImpact && (
              <Button variant="outline" size="sm" onClick={onAddImpact}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section-level explainability (if available) */}
        {impactData.explainability && (
          <ExplainabilityPanel
            explainability={impactData.explainability}
            meta={responseMeta}
            compact
          />
        )}

        {impacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No impacts defined or inferred</p>
            {onAddImpact && (
              <Button variant="link" onClick={onAddImpact} className="mt-2">
                Add explicit impact
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Grouped by subject type */}
            {subjectTypes.map((type) => {
              const typeImpacts = impactData.bySubjectType[type];
              if (!typeImpacts || typeImpacts.length === 0) return null;

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    {subjectTypeIcons[type]}
                    <h4 className="font-medium text-sm">
                      {subjectTypeLabels[type]}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {typeImpacts.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {typeImpacts.map((impact) => (
                      <ImpactRow
                        key={impact.impactKey}
                        impact={impact}
                        onDelete={
                          impact.source === "EXPLICIT" && onDeleteImpact
                            ? () => onDeleteImpact(impact.explicitImpactId!)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Metadata */}
        <Collapsible open={showMeta} onOpenChange={setShowMeta}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
            >
              <span>Why this answer?</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showMeta ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-3 text-sm text-muted-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Explicit impacts</p>
                <p>{evidence.explicitImpactIds.length}</p>
              </div>
              <div>
                <p className="font-medium">Inference rules applied</p>
                <p>{evidence.inferenceRulesApplied.length}</p>
              </div>
              <div>
                <p className="font-medium">Suppressed inferred</p>
                <p>{evidence.suppressedInferredCount}</p>
              </div>
              <div>
                <p className="font-medium">Generated at</p>
                <p className="font-mono text-xs">
                  {new Date(responseMeta.generatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div>
              <p className="font-medium mb-1">Assumptions</p>
              <p className="font-mono text-xs">{responseMeta.assumptionsId}</p>
            </div>
            {evidence.inferenceRulesApplied.length > 0 && (
              <div>
                <p className="font-medium mb-1">Rules applied</p>
                <ul className="font-mono text-xs space-y-1">
                  {evidence.inferenceRulesApplied.map((rule) => (
                    <li key={rule}>• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Impact Row
// ============================================================================

function ImpactRow({
  impact,
  onDelete,
}: {
  impact: ResolvedImpact;
  onDelete?: () => void;
}) {
  const severity = severityColors[impact.severity] ?? severityColors.LOW;
  const impactTypeInfo = impactTypeLabels[impact.impactType];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group">
      {/* Severity indicator */}
      <div className={`w-2 h-2 rounded-full mt-2 ${severity.dot}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{impact.subjectLabel}</span>
          <Badge
            variant="outline"
            className="text-xs"
            title={impactTypeInfo?.description}
          >
            {impactTypeInfo?.label ?? impact.impactType}
          </Badge>
          {impact.source === "INFERRED" && (
            <Badge
              variant="secondary"
              className="text-xs gap-1"
              title={`Inferred from rule: ${impact.inferenceRule}`}
            >
              <Sparkles className="h-3 w-3" />
              Inferred
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{impact.explanation}</p>
        {/* Confidence for inferred */}
        {impact.source === "INFERRED" && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            Confidence: {Math.round(impact.confidence.score * 100)}% —{" "}
            {impact.confidence.explanation[0]}
          </p>
        )}
      </div>

      {/* Delete button for explicit impacts */}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </Button>
      )}
    </div>
  );
}
