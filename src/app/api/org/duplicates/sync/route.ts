import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

function emailKey(email: string) {
  const e = norm(email);
  return e;
}

function nameKey(name: string) {
  const n = norm(name).replace(/\s+/g, " ");
  return n;
}

// Very lightweight similarity: shared prefix length ratio
function nameSimilarity(a: string, b: string) {
  const x = nameKey(a);
  const y = nameKey(b);
  if (!x || !y) return 0;
  const max = Math.max(x.length, y.length);
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i / max;
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });
  requireEdit((ctx as any).canEdit);

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  // Fetch people via OrgPosition (personId refers to OrgPosition.id) - exclude archived
  const positions = await prisma.orgPosition.findMany({
    where: { workspaceId, isActive: true, archivedAt: null },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Map to person-like structure
  const people = positions
    .filter((p) => p.user)
    .map((p) => ({
      id: p.id, // Use position ID as person ID
      name: p.user?.name || null,
      email: p.user?.email || null,
    }));

  const byEmail = new Map<string, string[]>();
  for (const p of people) {
    if (!p.email) continue;
    const k = emailKey(p.email);
    if (!k) continue;
    byEmail.set(k, [...(byEmail.get(k) || []), p.id]);
  }

  const candidates: Array<{ a: string; b: string; confidence: number; reason: string; features: any }> = [];

  // Exact email duplicates (high confidence)
  for (const [k, ids] of byEmail.entries()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        candidates.push({
          a: ids[i],
          b: ids[j],
          confidence: 0.98,
          reason: "email_exact",
          features: { email: k },
        });
      }
    }
  }

  // Name similarity + missing/partial email (medium confidence)
  // Limit pairwise explosion by bucketing first letter
  const buckets = new Map<string, any[]>();
  for (const p of people) {
    const nk = nameKey(p.name || "");
    const b = nk ? nk[0] : "_";
    buckets.set(b, [...(buckets.get(b) || []), p]);
  }

  for (const bucket of buckets.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const p = bucket[i];
        const q = bucket[j];
        const sim = nameSimilarity(p.name || "", q.name || "");
        if (sim < 0.75) continue;

        const pe = emailKey(p.email || "");
        const qe = emailKey(q.email || "");
        // If both have emails and they differ, reduce confidence
        const penalty = pe && qe && pe !== qe ? 0.2 : 0.0;

        const conf = Math.max(0.0, Math.min(0.9, 0.8 - penalty + sim * 0.1));
        candidates.push({
          a: p.id,
          b: q.id,
          confidence: conf,
          reason: "name_similar",
          features: { sim, names: [p.name, q.name], emails: [p.email, q.email] },
        });
      }
    }
  }

  // Upsert candidates (OPEN only)
  let upserted = 0;
  for (const c of candidates) {
    // Normalize pair ordering to maintain uniqueness
    const [personAId, personBId] = c.a < c.b ? [c.a, c.b] : [c.b, c.a];
    const existing = await prisma.orgDuplicateCandidate.findUnique({
      where: { orgId_personAId_personBId: { orgId: ctx.orgId, personAId, personBId } } as any,
    });

    if (existing && existing.status !== "OPEN") continue;

    await prisma.orgDuplicateCandidate.upsert({
      where: { orgId_personAId_personBId: { orgId: ctx.orgId, personAId, personBId } } as any,
      update: { confidence: c.confidence, reason: c.reason, features: c.features, status: "OPEN" },
      create: { orgId: ctx.orgId, personAId, personBId, confidence: c.confidence, reason: c.reason, features: c.features, status: "OPEN" },
    });

    upserted++;
  }

  return NextResponse.json({ ok: true, upserted });
}

