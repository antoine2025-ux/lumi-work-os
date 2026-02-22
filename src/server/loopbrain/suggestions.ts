type Suggestion = {
  personId: string;
  confidence: number; // 0..1
  rationale: string;
  evidence?: Array<{ label: string; value: string }>;
  patch: {
    managerId?: string | null;
    managerName?: string | null;
    teamName?: string | null;
    title?: string | null;
  };
};

interface PersonLike {
  id: string;
  managerId?: string | null;
  managerName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  team?: string | null;
  title?: string | null;
  role?: string | null;
}

export function computeSuggestionForPerson(args: {
  person: PersonLike;
  people: PersonLike[];
  managers?: PersonLike[];
}): Suggestion {
  const { person, people } = args;

  // Minimal explainability-first heuristic:
  // 1) If missing manager: suggest the most common manager in same team
  // 2) Confidence increases with peer count
  const team = person.teamName || person.team || null;

  let suggestedManagerId: string | null = null;
  let suggestedManagerName: string | null = null;
  let peers = 0;

  if (team) {
    const sameTeam = people.filter((p) => (p.teamName || p.team) === team && p.managerId);
    peers = sameTeam.length;

    const counts = new Map<string, { n: number; name?: string }>();
    for (const p of sameTeam) {
      const key = p.managerId ?? '';
      const cur = counts.get(key) || { n: 0, name: p.managerName ?? undefined };
      cur.n += 1;
      counts.set(key, cur);
    }

    let best: { id: string; n: number; name?: string } | null = null;
    for (const [id, v] of counts.entries()) {
      if (!best || v.n > best.n) best = { id, n: v.n, name: v.name };
    }

    if (best) {
      suggestedManagerId = best.id;
      suggestedManagerName = best.name || null;
    }
  }

  const hasManagerGap = !person.managerId;
  const patch: Suggestion["patch"] = {};
  let confidence = 0.3;
  let rationale = "No strong suggestion available.";
  const evidence: Suggestion["evidence"] = [];

  if (hasManagerGap && suggestedManagerId) {
    patch.managerId = suggestedManagerId;
    patch.managerName = suggestedManagerName;
    confidence = Math.min(0.95, 0.55 + Math.min(0.35, peers * 0.05));
    rationale = `Suggested based on ${peers} peers in the same team reporting to the same manager.`;
    evidence.push({ label: "Team", value: String(team) });
    evidence.push({ label: "Peers used", value: String(peers) });
    evidence.push({ label: "Proposed manager", value: suggestedManagerName || suggestedManagerId });
  }

  // Missing team/role can be expanded later; keep structure now:
  if (!team) {
    // No patch; but keep explainability structure consistent
    evidence.push({ label: "Team", value: "Missing" });
  }
  if (!person.title && !person.role) {
    evidence.push({ label: "Role/title", value: "Missing" });
  }

  return {
    personId: person.id,
    confidence,
    rationale,
    evidence,
    patch,
  };
}

export function computeSuggestionsBatch(args: { people: PersonLike[] }) {
  return args.people.map((p) => computeSuggestionForPerson({ person: p, people: args.people }));
}

