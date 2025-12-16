import { NextRequest, NextResponse } from "next/server";
import {
  fetchOrgContextSliceForCurrentWorkspace,
} from "@/lib/loopbrain/org-context-reader";

export async function GET(request: NextRequest) {
  try {
    const slice = await fetchOrgContextSliceForCurrentWorkspace(request);

    const root = slice.root
      ? {
          id: slice.root.id,
          title: slice.root.title,
          summary: slice.root.summary,
          updatedAt: slice.root.updatedAt,
        }
      : null;

    const limit = 20;

    const mapItem = (item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      summary: item.summary,
      tags: item.tags,
      status: item.status,
      updatedAt: item.updatedAt,
    });

    const people = slice.people.slice(0, limit).map(mapItem);
    const teams = slice.teams.slice(0, limit).map(mapItem);
    const departments = slice.departments.slice(0, limit).map(mapItem);
    const positions = slice.positions.slice(0, limit).map(mapItem);

    return NextResponse.json({
      ok: true,
      source: "context_store",
      org: {
        root,
        counts: {
          total: slice.all.length,
          people: slice.people.length,
          teams: slice.teams.length,
          departments: slice.departments.length,
          positions: slice.positions.length,
        },
        sample: {
          limit,
          people,
          teams,
          departments,
          positions,
        },
      },
    });
  } catch (error) {
    console.error("Loopbrain Org debug endpoint error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Loopbrain Org debug context",
      },
      { status: 500 }
    );
  }
}

