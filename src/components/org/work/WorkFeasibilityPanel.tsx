"use client";

/**
 * Work Feasibility Panel
 * 
 * Displays feasibility analysis and recommendation.
 * Phase H: UI renders API output only.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { ExplainabilityPanel } from "@/components/org/explainability/ExplainabilityPanel";

import type { WorkFeasibilityResult } from "@/lib/org/work/types";

type FeasibilityResult = WorkFeasibilityResult;

const actionConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  PROCEED: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: "Proceed",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/50",
  },
  REASSIGN: {
    icon: <ArrowRight className="h-5 w-5" />,
    label: "Reassign",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  DELAY: {
    icon: <Clock className="h-5 w-5" />,
    label: "Delay",
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/50",
  },
  REQUEST_SUPPORT: {
    icon: <UserPlus className="h-5 w-5" />,
    label: "Request Support",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/50",
  },
};

export function WorkFeasibilityPanel({
  feasibility,
}: {
  feasibility: FeasibilityResult;
}) {
  const action = actionConfig[feasibility.recommendation.action] ?? actionConfig.DELAY;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Staffing Feasibility</span>
          <div className="flex items-center gap-2">
            <Badge variant={feasibility.feasibility.canStaff ? "default" : "secondary"}>
              {feasibility.feasibility.canStaff ? "Can Staff" : "Cannot Staff"}
            </Badge>
            <Badge variant="outline">
              Confidence: {Math.round(feasibility.feasibility.confidence.score * 100)}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation */}
        <div className={`p-4 rounded-lg ${action.bgColor}`}>
          <div className={`flex items-center gap-3 ${action.color}`}>
            {action.icon}
            <span className="text-lg font-semibold">Recommendation: {action.label}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {feasibility.recommendation.explanation.map((exp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Candidates</p>
            <p className="text-2xl font-bold">{feasibility.evidence.candidateCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Viable</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {feasibility.evidence.viableCount}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Capacity Gap</p>
            <p className={`text-2xl font-bold ${
              feasibility.feasibility.capacityGapHours > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}>
              {feasibility.feasibility.capacityGapHours > 0
                ? `${feasibility.feasibility.capacityGapHours.toFixed(1)}h`
                : "None"}
            </p>
          </div>
        </div>

        {/* Explainability */}
        {feasibility.explainability ? (
          <ExplainabilityPanel
            explainability={feasibility.explainability}
            explanation={feasibility.feasibility.explanation.join(" ")}
            compact
          />
        ) : (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Analysis</p>
            <ul className="space-y-1 text-sm">
              {feasibility.feasibility.explanation.map((exp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-muted-foreground">•</span>
                  <span>{exp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence explanation */}
        {feasibility.feasibility.confidence.explanation.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Confidence notes:</p>
            <ul className="space-y-0.5">
              {feasibility.feasibility.confidence.explanation.map((exp, i) => (
                <li key={i}>• {exp}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Escalation Contacts (Phase I) */}
        {feasibility.recommendation.action === "REQUEST_SUPPORT" &&
          feasibility.escalationContacts && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="font-medium">Escalate to</span>
                {feasibility.escalationContacts.domainKey && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {feasibility.escalationContacts.domainKey}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {feasibility.escalationContacts.firstAvailable ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">First available:</span>
                    <span className="font-medium">
                      {feasibility.escalationContacts.firstAvailable.personName}
                    </span>
                  </div>
                ) : feasibility.escalationContacts.primary ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Primary:</span>
                    <span className="font-medium">
                      {feasibility.escalationContacts.primary.personName}
                    </span>
                  </div>
                ) : null}

                {feasibility.escalationContacts.escalation.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">Escalation:</span>
                    <span>
                      {feasibility.escalationContacts.escalation
                        .map((c) => c.personName)
                        .join(" → ")}
                    </span>
                  </div>
                )}

                {/* Collapsible explanation */}
                {feasibility.escalationContacts.whyTheseContacts.length > 0 && (
                  <details className="text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Why these contacts?
                    </summary>
                    <ul className="mt-2 ml-4 space-y-1">
                      {feasibility.escalationContacts.whyTheseContacts.map((why, i) => (
                        <li key={i}>• {why}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
