import { NextResponse } from "next/server";
import {
  syncDepartmentContextItem,
  syncTeamContextItem,
  syncPositionContextItem,
  syncPersonContextItem,
} from "@/lib/loopbrain/orgContextPersistence";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/org-context-sync-entity
 * Body: { kind: "department" | "team" | "position" | "person", id: string }
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Org context per-entity sync is not available in production." },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { kind, id } = body as {
      kind: "department" | "team" | "position" | "person";
      id: string;
    };

    let result;

    switch (kind) {
      case "department":
        result = await syncDepartmentContextItem(id);
        break;
      case "team":
        result = await syncTeamContextItem(id);
        break;
      case "position":
        result = await syncPositionContextItem(id);
        break;
      case "person":
        result = await syncPersonContextItem(id);
        break;
      default:
        return NextResponse.json(
          { ok: false, error: "Unsupported kind" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, kind, id, result }, { status: 200 });
  } catch (error: unknown) {
    console.error("[dev/org-context-sync-entity] Failed", error);

    return NextResponse.json(
      { ok: false, error: "Failed to sync entity." },
      { status: 500 }
    );
  }
}

