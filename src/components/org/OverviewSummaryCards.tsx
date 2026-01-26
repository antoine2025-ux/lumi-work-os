/**
 * Overview Summary Cards Component
 * 
 * Displays simple counts: People, Departments, Teams, Unowned entities.
 * Each card is a single clickable navigation anchor.
 * Shows "—" when data is unavailable.
 */

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  count: number | null;
  helper: string;
  href: string;
};

function StatCard({ title, count, helper, href }: StatCardProps) {
  const formatCount = (c: number | null) => (c !== null ? c.toString() : "—");

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border bg-card text-card-foreground shadow-sm",
        "hover:border-slate-600 transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-100">{formatCount(count)}</div>
          <div className="text-xs text-slate-500 mt-1">{helper}</div>
        </div>
        {/* Decorative chevron — no click handler */}
        <ChevronRight className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </CardContent>
    </Link>
  );
}

export function OverviewSummaryCards() {
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);

  const peopleCount = overviewQ.data?.summary?.peopleCount ?? null;
  const deptCount = overviewQ.data?.summary?.deptCount ?? null;
  const teamCount = overviewQ.data?.summary?.teamCount ?? null;
  const unowned = overviewQ.data?.summary?.unownedEntities ?? null;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatCard
        title="People"
        count={peopleCount}
        helper="View and manage people"
        href="/org/people"
      />
      <StatCard
        title="Departments"
        count={deptCount}
        helper="View and manage departments"
        href="/org/structure?tab=departments"
      />
      <StatCard
        title="Teams"
        count={teamCount}
        helper="View and manage teams"
        href="/org/structure?tab=teams"
      />
      <StatCard
        title="Unowned entities"
        count={unowned}
        helper="Assign accountability"
        href="/org/ownership"
      />
    </div>
  );
}
