import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext, requireAdmin } from "@/server/rbac";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireAdmin((ctx as any).canAdmin);

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(90, Number(searchParams.get("days") || "14")));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const runs = await prisma.orgSuggestionRun.findMany({
    where: { orgId: ctx.orgId, scope: "people_issues", createdAt: { gte: since } },
    select: { id: true, createdAt: true, engineId: true },
  });

  const feedback = await prisma.loopBrainFeedback.findMany({
    where: { orgId: ctx.orgId, scope: "people_issues", createdAt: { gte: since } },
    select: { accepted: true, partiallyApplied: true, createdAt: true, suggestionRunId: true },
  });

  const runCount = runs.length;
  const feedbackCount = feedback.length;
  const acceptedCount = feedback.filter((f) => f.accepted === true).length;
  const rejectedCount = feedback.filter((f) => f.accepted === false).length;
  const partialCount = feedback.filter((f) => f.partiallyApplied === true).length;

  // Simple per-engine breakdown
  const byEngine = new Map<string, { runs: number; accepted: number; rejected: number; partial: number }>();

  for (const r of runs) {
    const k = r.engineId || "unknown";
    const cur = byEngine.get(k) || { runs: 0, accepted: 0, rejected: 0, partial: 0 };
    cur.runs += 1;
    byEngine.set(k, cur);
  }

  for (const f of feedback) {
    const run = runs.find((r) => r.id === f.suggestionRunId);
    const k = run?.engineId || "unknown";
    const cur = byEngine.get(k) || { runs: 0, accepted: 0, rejected: 0, partial: 0 };
    if (f.accepted === true) cur.accepted += 1;
    if (f.accepted === false) cur.rejected += 1;
    if (f.partiallyApplied === true) cur.partial += 1;
    byEngine.set(k, cur);
  }

  // Fetch outcomes for impact metrics
  const outcomes = await prisma.loopBrainOutcome.findMany({
    where: { orgId: ctx.orgId, scope: "people_issues", measuredAt: { gte: since } },
    orderBy: { measuredAt: "desc" },
    take: 100,
  });

  const improvedCount = outcomes.filter((o) => o.improved).length;
  const latestOutcome = outcomes[0] || null;

  return NextResponse.json({
    ok: true,
    windowDays: days,
    totals: { runCount, feedbackCount, acceptedCount, rejectedCount, partialCount, improvedCount },
    byEngine: Array.from(byEngine.entries()).map(([engineId, v]) => ({ engineId, ...v })),
    latestOutcome: latestOutcome
      ? {
          before: latestOutcome.beforeMetrics,
          after: latestOutcome.afterMetrics,
          improved: latestOutcome.improved,
        }
      : null,
  });
}

