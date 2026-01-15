/**
 * Overview Summary Cards Component
 * 
 * Displays simple counts: People, Departments, Teams, Unowned entities.
 * Shows "—" when data is unavailable.
 */

"use client";

import Link from "next/link";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function OverviewSummaryCards() {
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);

  // Format counts - show "—" when data unavailable
  const peopleCount = overviewQ.data?.summary?.peopleCount ?? null;
  const deptCount = overviewQ.data?.summary?.deptCount ?? null;
  const teamCount = overviewQ.data?.summary?.teamCount ?? null;
  const unowned = overviewQ.data?.summary?.unownedEntities ?? null;

  const formatCount = (count: number | null) => {
    return count !== null ? count.toString() : "—";
  };

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">People</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-slate-100">{formatCount(peopleCount)}</div>
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <Link href="/org/people">View</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Departments</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-slate-100">{formatCount(deptCount)}</div>
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <Link href="/org/structure">View</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Teams</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-slate-100">{formatCount(teamCount)}</div>
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <Link href="/org/structure">View</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Unowned entities</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-slate-100">{formatCount(unowned)}</div>
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <Link href="/org/ownership">View</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
