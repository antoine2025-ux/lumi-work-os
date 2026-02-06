/**
 * PersonResponsibilities – Read-only section for the Person Profile Drawer
 *
 * Shows:
 *   - Decision domains where this person is the primary decider
 *   - Coverage domains where this person appears in escalation steps
 *   - Responsibility tag overrides
 *   - Warning badge if person owns domains with no coverage
 *
 * Fetches from /api/org/people/[personId]/responsibilities.
 * Only renders if the person has any responsibility data.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Users, Tag } from "lucide-react";

type PrimaryDomain = {
  domainKey: string;
  domainName: string;
  hasCoverage: boolean;
};

type CoverageDomain = {
  domainKey: string;
  domainName: string;
  stepOrder: number;
};

type ResponsibilityOverride = {
  tagKey: string;
  tagLabel: string;
  reason: string | null;
};

type ResponsibilityData = {
  primaryDomains: PrimaryDomain[];
  coverageDomains: CoverageDomain[];
  responsibilityOverrides: ResponsibilityOverride[];
};

export function PersonResponsibilities({ personId }: { personId: string }) {
  const [data, setData] = useState<ResponsibilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/org/people/${personId}/responsibilities`, {
        credentials: "include",
      });
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      setData({
        primaryDomains: json.primaryDomains ?? [],
        coverageDomains: json.coverageDomains ?? [],
        responsibilityOverrides: json.responsibilityOverrides ?? [],
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Don't render anything while loading or if no data
  if (loading) return null;
  if (!data) return null;

  const hasAny =
    data.primaryDomains.length > 0 ||
    data.coverageDomains.length > 0 ||
    data.responsibilityOverrides.length > 0;

  if (!hasAny) return null;

  const noCoverageCount = data.primaryDomains.filter((d) => !d.hasCoverage).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Responsibilities</h3>
        {noCoverageCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {noCoverageCount} with no backup
          </Badge>
        )}
      </div>

      {/* Primary decision domains */}
      {data.primaryDomains.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Primary decider
          </p>
          {data.primaryDomains.map((d) => (
            <Link
              key={d.domainKey}
              href={`/org/settings/decision-authority?domain=${encodeURIComponent(d.domainKey)}`}
              className="flex items-center justify-between py-1 px-2 rounded text-xs hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">{d.domainName}</span>
              {d.hasCoverage ? (
                <Badge variant="outline" className="text-[10px]">
                  <Users className="h-2.5 w-2.5 mr-1" />
                  Covered
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-[10px] text-amber-600 dark:text-amber-400"
                >
                  No backup
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Coverage / escalation domains */}
      {data.coverageDomains.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Backup for
          </p>
          {data.coverageDomains.map((d) => (
            <div
              key={`${d.domainKey}-${d.stepOrder}`}
              className="flex items-center justify-between py-1 px-2 text-xs"
            >
              <span>{d.domainName}</span>
              <span className="text-muted-foreground">Step {d.stepOrder + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Responsibility overrides */}
      {data.responsibilityOverrides.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Responsibility overrides
          </p>
          {data.responsibilityOverrides.map((o) => (
            <div
              key={o.tagKey}
              className="flex items-center gap-2 py-1 px-2 text-xs"
            >
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span>{o.tagLabel}</span>
              {o.reason && (
                <span className="text-muted-foreground">— {o.reason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
