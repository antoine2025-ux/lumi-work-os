/**
 * Entity Graph API
 *
 * Provides access to the organizational entity graph for Loopbrain reasoning.
 * Returns EntityGraphSnapshotV0 containing nodes, links, and pre-computed maps.
 *
 * GET - Retrieve entity graph for workspace
 * POST - Trigger graph rebuild (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { buildLogContextFromRequest } from "@/lib/request-context";
import {
  buildEntityGraphSnapshot,
  getCachedEntityGraph,
  invalidateGraphCache,
} from "@/lib/loopbrain/entity-graph";
import { LoopbrainEntityGraphRebuildSchema } from "@/lib/validations/loopbrain";

/**
 * GET /api/loopbrain/entity-graph
 *
 * Query params:
 * - includeInactive: boolean (default: false) - Include inactive entities
 * - limit: number (default: 10000) - Max entities per type
 * - fresh: boolean (default: false) - Bypass cache
 *
 * Response: EntityGraphSnapshotV0
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request GET /api/loopbrain/entity-graph", baseContext);

  try {
    // Get auth context
    const auth = await getUnifiedAuth(request);

    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Set workspace context for Prisma scoping
    setWorkspaceContext(auth.workspaceId);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";
    const limit = parseInt(searchParams.get("limit") || "10000", 10);
    const fresh = searchParams.get("fresh") === "true";

    // Build or retrieve cached graph
    const snapshot = fresh
      ? await buildEntityGraphSnapshot(auth.workspaceId, {
          includeInactive,
          limit,
        })
      : await getCachedEntityGraph(auth.workspaceId, {
          includeInactive,
          limit,
        });

    const duration = Date.now() - startTime;
    logger.info("Entity graph retrieved", {
      ...baseContext,
      workspaceId: auth.workspaceId,
      nodeCount: snapshot.nodes.length,
      linkCount: snapshot.links.length,
      durationMs: duration,
      cached: !fresh,
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

/**
 * POST /api/loopbrain/entity-graph
 *
 * Triggers a graph rebuild and cache invalidation.
 * Requires ADMIN role.
 *
 * Request body (optional):
 * - includeInactive: boolean (default: false)
 * - limit: number (default: 10000)
 *
 * Response: EntityGraphSnapshotV0
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const baseContext = await buildLogContextFromRequest(request);

  logger.info("Incoming request POST /api/loopbrain/entity-graph", baseContext);

  try {
    // Get auth context
    const auth = await getUnifiedAuth(request);

    // Assert admin access for rebuild
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    // Set workspace context for Prisma scoping
    setWorkspaceContext(auth.workspaceId);

    // Parse request body (optional fields with defaults)
    const body = LoopbrainEntityGraphRebuildSchema.parse(
      await request.json().catch(() => ({}))
    );

    const includeInactive = false; // Not in schema, use default
    const limit = 10000; // Not in schema, use default

    // Invalidate cache first
    invalidateGraphCache(auth.workspaceId);

    // Build fresh graph
    const snapshot = await buildEntityGraphSnapshot(auth.workspaceId, {
      includeInactive,
      limit,
    });

    const duration = Date.now() - startTime;
    logger.info("Entity graph rebuilt", {
      ...baseContext,
      workspaceId: auth.workspaceId,
      nodeCount: snapshot.nodes.length,
      linkCount: snapshot.links.length,
      durationMs: duration,
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
