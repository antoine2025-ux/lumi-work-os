// src/app/api/loopbrain/org/context/bundle/route.ts

import { NextRequest, NextResponse } from "next/server";
import { loadCurrentWorkspaceOrgContextBundle } from "@/lib/context/org/loadCurrentWorkspaceOrgContextBundle";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors"

export const dynamic = "force-dynamic";

/**
 * GET /api/loopbrain/org/context/bundle
 *
 * Returns a unified OrgContextBundle from the Context Store for the current workspace.
 * This endpoint is READ-ONLY: it does not trigger sync; combine with POST /api/loopbrain/org/context/sync when you want fresh data.
 *
 * Protected: getUnifiedAuth → assertAccess (workspace MEMBER) → load bundle.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No workspace found",
          detail: "User must have an active workspace",
        },
        { status: 401 }
      );
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const { workspaceId, bundle } =
      await loadCurrentWorkspaceOrgContextBundle(request);

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        bundle: {
          org: bundle.org
            ? {
                id: bundle.org.id,
                contextId: bundle.org.contextId,
                type: bundle.org.type,
                title: bundle.org.title,
                summary: bundle.org.summary,
                updatedAt: bundle.org.updatedAt.toISOString(),
              }
            : null,
          departments: bundle.departments.map((item) => ({
            id: item.id,
            contextId: item.contextId,
            type: item.type,
            title: item.title,
            summary: item.summary,
            updatedAt: item.updatedAt.toISOString(),
          })),
          teams: bundle.teams.map((item) => ({
            id: item.id,
            contextId: item.contextId,
            type: item.type,
            title: item.title,
            summary: item.summary,
            updatedAt: item.updatedAt.toISOString(),
          })),
          roles: bundle.roles.map((item) => ({
            id: item.id,
            contextId: item.contextId,
            type: item.type,
            title: item.title,
            summary: item.summary,
            updatedAt: item.updatedAt.toISOString(),
          })),
          people: bundle.people.map((item) => ({
            id: item.id,
            contextId: item.contextId,
            type: item.type,
            title: item.title,
            summary: item.summary,
            updatedAt: item.updatedAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

