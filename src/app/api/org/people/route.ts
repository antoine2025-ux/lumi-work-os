/**
 * GET /api/org/people
 * List all people in the organization.
 *
 * Phase S: People signals (manager load, missing managers) from canonical resolver.
 * SECURITY: workspaceId from auth only, never from query params.
 * See docs/org/intelligence-rules.md for canonical rules.
 *
 * Response contract:
 * - Success: { ok: true, data: { people, signals } }
 * - Auth error: { ok: false, error: { code, message } } with 401/403
 * - DB error: { ok: false, error: { code, message } } with 503
 * - Other error: { ok: false, error: { code, message } } with 500
 *
 * Data enrichment:
 * - listOrgPeople(workspaceId) returns base people data (name, team, manager, etc.)
 * - resolvePeopleSignals() provides needsManager indicator (via snapshot)
 * - This route enriches each person with `needsManager: boolean` from the resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { listOrgPeople } from "@/server/org/people/read";
import { getOrgIntelligenceSnapshot } from "@/lib/org/intelligence";
import {
  isPrismaError,
  classifyAuthError,
  unauthorizedResponse,
  forbiddenResponse,
  serviceUnavailableResponse,
  internalErrorResponse,
  logApiError,
  shouldLogVerbose,
} from "@/lib/api/errors";

const ROUTE = "GET /api/org/people";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    // SECURITY: workspaceId from auth only, never from query params
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      if (shouldLogVerbose()) {
        console.error(`[${ROUTE}] Missing userId or workspaceId`);
      }
      return unauthorizedResponse("Authentication required. Please log in.");
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Fetch people list and people signals in parallel
    // NOTE: listOrgPeople uses workspaceId directly for scoping (no implicit context)
    // NOTE: resolvePeopleSignals (via snapshot) provides needsManager from canonical resolver
    if (shouldLogVerbose()) {
      console.log(`[${ROUTE}] Fetching people`);
    }

    const [data, snapshot] = await Promise.all([
      listOrgPeople(workspaceId),
      getOrgIntelligenceSnapshot(workspaceId, { include: { people: true } }),
    ]);

    if (shouldLogVerbose()) {
      console.log(`[${ROUTE}] Found ${data.people.length} people`);
    }

    // Phase S: Build set of people who need managers (from canonical resolver)
    // needsManager is derived from resolvePeopleSignals().peopleWithoutManagers
    const peopleWithoutManagersSet = new Set(
      (snapshot.people?.peopleWithoutManagers ?? []).map((p) => p.id)
    );

    // Enrich people with needsManager indicator from resolver
    // Contract: each person now has `needsManager: boolean` derived from canonical source
    const enrichedPeople = data.people.map((person) => ({
      ...person,
      needsManager: peopleWithoutManagersSet.has(person.id),
    }));

    return NextResponse.json(
      {
        ok: true,
        data: {
          people: enrichedPeople,
          // Phase S: Include people signals for UI consumption
          signals: {
            peopleWithoutManagersCount: snapshot.people?.peopleWithoutManagers.length ?? 0,
            overloadedManagersCount: snapshot.people?.overloadedManagers.length ?? 0,
            issues: snapshot.people?.issues ?? [],
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logApiError(ROUTE, error);

    // Classify auth errors: 401 vs 403
    const authType = classifyAuthError(error);
    if (authType === "unauthorized") {
      return unauthorizedResponse("Authentication failed. Please log in again.");
    }
    if (authType === "forbidden") {
      return forbiddenResponse("You don't have permission to access this resource.");
    }

    // Database errors: 503 Service Unavailable (not 200 with empty data)
    // This ensures clients know data is unavailable vs actually empty
    if (isPrismaError(error)) {
      return serviceUnavailableResponse(
        "Unable to load people data. Please try again later.",
        { retryable: true }
      );
    }

    // Other errors: 500 Internal Server Error
    return internalErrorResponse("Failed to load people. Please try again.");
  }
}
