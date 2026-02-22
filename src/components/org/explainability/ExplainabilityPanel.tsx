"use client";

/**
 * Explainability Panel
 *
 * Canonical renderer for structured explainability across all Org surfaces.
 * Answers three questions consistently:
 * 1. Why does this exist?
 * 2. What does it depend on?
 * 3. What changes would remove or change it?
 *
 * Supports legacy fallback during migration (explanation string + fixAction).
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ExplainabilityBlock, ExplainabilityMeta } from "@/lib/org/explainability/types";

type ExplainabilityPanelProps = {
  explainability?: ExplainabilityBlock; // Optional during migration
  explanation?: string; // Legacy fallback
  fixAction?: string; // Legacy fallback for "what changes it"
  meta?: ExplainabilityMeta;
  compact?: boolean;
};

// Friendly labels for dependency types
const DEPENDENCY_TYPE_LABELS: Record<string, string> = {
  DATA: "Data",
  RULE: "Rules",
  CONFIG: "Settings",
  TIME_WINDOW: "Time window",
};

export function ExplainabilityPanel({
  explainability,
  explanation,
  fixAction,
  meta,
  compact = false,
}: ExplainabilityPanelProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [dependsOnExpanded, setDependsOnExpanded] = useState(!compact);

  // Legacy fallback: if no explainability, try to render from legacy fields
  if (!explainability) {
    if (!explanation && !fixAction) {
      // Nothing to show, hide panel entirely
      return null;
    }

    // Render minimal panel from legacy fields
    return (
      <Card className="border-dashed">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Why this exists?</CardTitle>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {explanation && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Why this exists
                  </div>
                  <p className="text-sm text-foreground">{explanation}</p>
                </div>
              )}

              {fixAction && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    What changes it
                  </div>
                  <p className="text-sm text-foreground">{fixAction}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // Render structured explainability
  const dependsOnCount = explainability.dependsOn.length;

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Why this exists?</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Why this exists */}
            {explainability.why.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Why this exists
                </div>
                <ul className="space-y-1.5 text-sm">
                  {explainability.why.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span className="text-foreground">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What it depends on */}
            {explainability.dependsOn.length > 0 && (
              <div className="space-y-3">
                <Collapsible open={dependsOnExpanded} onOpenChange={setDependsOnExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                      <span>What it depends on</span>
                      {compact && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {dependsOnCount}
                        </Badge>
                      )}
                      {dependsOnExpanded ? (
                        <ChevronUp className="h-3 w-3 ml-auto" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-auto" />
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-2 mt-2">
                      {/* Group by type */}
                      {(["DATA", "RULE", "CONFIG", "TIME_WINDOW"] as const).map((type) => {
                        const deps = explainability.dependsOn.filter((d) => d.type === type);
                        if (deps.length === 0) return null;

                        return (
                          <div key={type} className="space-y-1.5">
                            <div className="text-xs font-medium text-muted-foreground">
                              {DEPENDENCY_TYPE_LABELS[type]}
                            </div>
                            <ul className="space-y-1 text-sm ml-2">
                              {deps.map((dep, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-muted-foreground mt-0.5">•</span>
                                  <span className="text-foreground">
                                    {dep.label}
                                    {dep.reference && (
                                      <span className="text-muted-foreground font-mono text-xs ml-1">
                                        ({dep.reference})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* What changes it */}
            {explainability.whatChangesIt.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <HelpCircle className="h-3.5 w-3.5" />
                  What changes it
                </div>
                <ul className="space-y-1.5 text-sm">
                  {explainability.whatChangesIt.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span className="text-foreground">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meta (optional, visually subtle) */}
            {meta && (
              <div className="pt-4 border-t border-muted">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assumptions ID</span>
                  <Badge variant="outline" className="font-mono">
                    {meta.assumptionsId}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Versions</span>
                  <span className="font-mono">
                    v{meta.evidenceVersion}.{meta.semanticsVersion}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
