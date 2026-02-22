/**
 * Org API Client
 * 
 * Centralized client-side API wrapper for Org endpoints.
 * This is the ONLY place UI components should call Org APIs.
 * No Prisma imports anywhere in UI.
 */

import type { MutationResponse, OwnershipPatch, EmptyPatch } from "@/lib/org/mutations/types";

export type OrgFlagsDTO = {
  flags: {
    peopleWrite: boolean;
    structureWrite: boolean;
    ownershipWrite: boolean;
    reportingWrite: boolean;
    availabilityWrite: boolean;
  };
};

export type OrgPeopleListDTO = {
  people: Array<{
    id: string;
    fullName: string;
    email: string | null;
    title: string | null;
    department: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    manager: { id: string; fullName: string } | null;
    availabilityStatus: "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
    availabilityUpdatedAt: string | null;
    availabilityStale: boolean;
  }>;
};

export type OrgPersonDTO = {
  id: string;
  fullName: string;
  email: string | null;
  title: string | null;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; fullName: string } | null;
  directReports: Array<{ id: string; fullName: string }>;
  availabilityStatus: "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
  availabilityUpdatedAt: string | null;
  availabilityStale: boolean;
};

export type OrgStructureDTO = {
  departments: Array<{
    id: string;
    name: string;
    teams: Array<{
      id: string;
      name: string;
      ownerPersonId: string | null;
      memberCount: number;
    }>;
  }>;
  teams: Array<{
    id: string;
    name: string;
    departmentId: string | null;
    ownerPersonId: string | null;
    memberCount: number;
  }>;
};

export type OrgTeamDetailDTO = {
  team: {
    id: string;
    name: string;
    departmentId: string | null;
    ownerPersonId: string | null;
    members: Array<{
      personId: string;
      fullName: string;
      email: string | null;
      title: string | null;
      availabilityStatus: "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
    }>;
  };
};

export type OrgOwnershipDTO = {
  coverage: {
    teams: { total: number; owned: number; unowned: number };
    departments: { total: number; owned: number; unowned: number };
  };
  unowned: Array<
    | { entityType: "TEAM"; entityId: string; name: string; departmentName: string | null }
    | { entityType: "DEPARTMENT"; entityId: string; name: string }
  >;
  assignments: Array<{
    id: string;
    entityType: "TEAM" | "DEPARTMENT";
    entityId: string;
    owner: { id: string; fullName: string };
  }>;
};

export type OrgIntelligenceFinding = {
  signal: "MANAGEMENT_LOAD" | "OWNERSHIP_RISK" | "STRUCTURAL_GAP";
  severity: "LOW" | "MEDIUM" | "HIGH";
  entityType: "PERSON" | "TEAM" | "DEPARTMENT" | "ORG";
  entityId: string | null;
  title: string;
  explanation: string;
  evidence: Record<string, any>;
};

export type OrgIntelligenceRollups = {
  totals: { findings: number };
  bySignal: Record<string, number>;
  bySeverity: Record<string, number>;
};

export type OrgIntelligenceFilterPrefs = {
  signals: string[]; // e.g. ["MANAGEMENT_LOAD"]
  severities: string[]; // e.g. ["HIGH","MEDIUM"]
  entityTypes: string[]; // e.g. ["PERSON"]
  query: string; // text search
};

export type OrgRecommendation = {
  id: string;
  actionType:
    | "ASSIGN_OWNER"
    | "SET_MANAGER"
    | "SET_AVAILABILITY"
    | "ASSIGN_TEAM"
    | "REVIEW_MANAGEMENT_LOAD";
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  entityType: "PERSON" | "TEAM" | "DEPARTMENT" | "ORG";
  entityId: string | null;
  fixHref: string;
  sourceFinding: OrgIntelligenceFinding;
};

export type SnapshotFreshness = {
  hasSnapshot: boolean;
  snapshotId: string | null;
  snapshotCreatedAt: string | null;
  ageMinutes: number | null;
  status: "MISSING" | "FRESH" | "STALE" | "OUTDATED";
  policy: { freshMinutes: number; warnMinutes: number };
};

export type OrgLatestIntelligenceSnapshotDTO = {
  snapshot: null | {
    id: string;
    createdAt: string;
    source: string;
    findingCount: number;
    findings: OrgIntelligenceFinding[];
    rollups: OrgIntelligenceRollups | null;
  };
  freshness: SnapshotFreshness;
};

// ============================================================================
// Phase R: Reasoning/Recommendations Types
// ============================================================================

export type OrgReasoningRecommendation = {
  code: string;
  severity: "info" | "warning" | "critical";
  category: "ownership" | "people" | "structure" | "capacity";
  title: string;
  summary: string;
  evidence: {
    issueCodes: string[];
    entities: Array<{ type: string; id: string; name?: string }>;
    meta: {
      count?: number;
      snapshotMeta: {
        schemaVersion: number;
        semanticsVersion: number;
        assumptionsId: string;
      };
    };
  };
  actions: Array<{
    label: string;
    href: string;
    surface: string;
    primary?: boolean;
  }>;
  rank: number;
};

export type OrgReasoningResultDTO = {
  ok: true;
  data: {
    recommendations: OrgReasoningRecommendation[];
    summaries: {
      byCategory: Record<string, number>;
      criticalCount: number;
      total: number;
    };
    _meta: {
      computedAt: string;
      reasoningSchemaVersion: number;
      reasoningSemanticsVersion: number;
      snapshotApiVersion: string;
      inputSnapshotMeta: {
        schemaVersion: number;
        semanticsVersion: number;
        assumptionsId: string;
      };
    };
  };
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include", // Include cookies for auth
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status} ${res.statusText || ''}`.trim();
    let hint: string | undefined;
    try {
      const contentType = res.headers.get("content-type");
      // Always read as text first, then try to parse as JSON if content-type says JSON
      // This avoids the "Unexpected token '<'" error when server returns HTML with JSON content-type
      const text = await res.text();
      const preview = text.substring(0, 200);
      
      if (contentType?.includes("application/json")) {
        // Try to parse as JSON
        try {
          const body = JSON.parse(text);
          
          // Extract error message - support both { error: "..." } and { error: { message: "..." } } formats
          const errorMsg = typeof body?.error === 'string' 
            ? body.error 
            : body?.error?.message || body?.message;
          if (errorMsg) {
            msg = errorMsg;
          }
          hint = body?.hint;
          // Prefer hint if available, otherwise use error message
          if (hint) {
            msg = hint;
          }
        } catch (_jsonError) {
          // Content-type says JSON but body is not JSON (likely HTML)
          msg = `Request failed: ${res.status} ${res.statusText || ''} (server returned HTML despite JSON content-type)`;
        }
      } else {
        // Not JSON, log the preview
        msg = `Request failed: ${res.status} ${res.statusText || ''} (server returned ${contentType || 'unknown content type'})`;
        if (text && text.length > 0) {
          // Include a preview of non-JSON response
          const safePreview = preview.replace(/[^\x20-\x7E]/g, ' ').trim();
          if (safePreview) {
            msg += `. Preview: ${safePreview}`;
          }
          // If it looks like HTML (error page), try to extract error message
          if (text.includes('<title>') || text.includes('<body>')) {
            const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
              msg += `. Error page title: ${titleMatch[1]}`;
            }
          }
        }
      }
    } catch (_parseError) {
      // Ignore parse errors but keep the status-based message
      // Ensure msg is always a valid string
      if (!msg || typeof msg !== 'string') {
        msg = `Request failed: ${res.status} ${res.statusText || ''} (unable to read response body)`;
      }
    }
    // Ensure msg is always a non-empty string before throwing
    if (!msg || typeof msg !== 'string' || msg.trim().length === 0) {
      msg = `Request failed: ${res.status} ${res.statusText || 'Unknown error'}`;
    }
    throw new Error(msg);
  }

  // For successful responses (2xx), parse JSON
  // Check content-type before parsing JSON (even for 200/201 OK responses)
  const contentType = res.headers.get("content-type");
  
  // Only read the body once - clone the response if we need to check content-type
  // For 201/200 responses, we expect JSON
  if (contentType?.includes("application/json")) {
    // Response is JSON, parse it
    try {
      const jsonData = await res.json() as T;
      return jsonData;
    } catch (parseError) {
      // JSON parse failed - might be empty body or malformed JSON
      // For 201 Created, empty body is sometimes acceptable
      if (res.status === 201) {
        // Return empty object for 201 with empty body
        return {} as T;
      }
      throw new Error(`Failed to parse JSON response from ${path}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } else {
    // Not JSON - this is unexpected for our API endpoints
    // Read as text to see what we got (but don't throw for 201 with empty body)
    if (res.status === 201 || res.status === 204) {
      // 201 Created or 204 No Content with non-JSON is acceptable
      return {} as T;
    }
    const text = await res.text();
    const preview = text.substring(0, 200);
    throw new Error(`Expected JSON response but got ${contentType || "unknown content type"} from ${path}. Response preview: ${preview}`);
  }
}

export type OrgOverviewDTO = {
  summary: {
    peopleCount: number;
    teamCount: number;
    deptCount: number;
    unownedEntities: number;
  };
  readiness: {
    people_added: boolean;
    structure_defined: boolean;
    ownership_assigned: boolean;
  };
};

// Client-side caching helpers
const FLAGS_CACHE_TTL_MS = 30 * 1000; // 30 seconds
let flagsCache: { data: OrgFlagsDTO | null; timestamp: number } = { data: null, timestamp: 0 };

const INTELLIGENCE_SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60 seconds
let intelligenceSettingsCache: {
  data: {
    settings: {
      mgmtMediumDirectReports: number;
      mgmtHighDirectReports: number;
      availabilityStaleDays: number;
      snapshotFreshMinutes: number;
      snapshotWarnMinutes: number;
      schemaVersion: number;
    };
  } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

export const OrgApi = {
  getFlags: () => {
    // Return cached flags if still valid
    const now = Date.now();
    if (flagsCache.data && (now - flagsCache.timestamp) < FLAGS_CACHE_TTL_MS) {
      return Promise.resolve(flagsCache.data);
    }
    
    // Fetch and cache
    return api<OrgFlagsDTO>("/api/org/flags").then((data) => {
      flagsCache = { data, timestamp: now };
      return data;
    });
  },
  getOrgOverview: () => api<OrgOverviewDTO>("/api/org/overview"),
  listPeople: () => api<OrgPeopleListDTO>("/api/org/people"),
  getPerson: (personId: string) => api<OrgPersonDTO>(`/api/org/people/${personId}`),
  getStructure: () => api<OrgStructureDTO>("/api/org/structure"),
  getTeamDetail: (teamId: string) => api<OrgTeamDetailDTO>(`/api/org/structure/teams/${teamId}`),
  getOwnership: () => api<OrgOwnershipDTO>("/api/org/ownership"),

  createPerson: (payload: {
    fullName: string;
    email?: string | null;
    title?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    managerId?: string | null;
  }) =>
    api<{ id: string }>("/api/org/people/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePerson: (
    personId: string,
    payload: {
      fullName: string;
      email?: string | null;
      title?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
    }
  ) =>
    api<{ id: string }>(`/api/org/people/${personId}/update`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setManager: (personId: string, payload: { managerId: string | null }) =>
    api<MutationResponse<{ personId: string; managerId: string | null; managerName: string | null }, EmptyPatch>>(
      `/api/org/people/${personId}/manager`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  setName: (personId: string, payload: { name: string }) =>
    api<{ id: string; fullName: string }>(
      `/api/org/people/${personId}/name`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  setTitle: (personId: string, payload: { title: string | null }) =>
    api<{ id: string; title: string | null }>(
      `/api/org/people/${personId}/title`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  setTeam: (personId: string, payload: { teamId: string | null }) =>
    api<MutationResponse<{ personId: string; teamId: string | null }, EmptyPatch>>(
      `/api/org/people/${personId}/team`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),

  assignOwner: (payload: {
    entityType: "TEAM" | "DEPARTMENT";
    entityId: string;
    ownerPersonId: string;
  }) =>
    api<{
      id: string;
      affectedIssues: Array<{
        issueKey: string;
        issueId: string;
        type: string;
        severity: 'error' | 'warning' | 'info';
        entityType: 'TEAM' | 'DEPARTMENT' | 'PERSON' | 'POSITION';
        entityId: string;
        entityName: string;
        explanation: string;
        fixUrl: string;
        fixAction: string;
      }>;
      affectedSignals: Array<{
        issueKey: string;
        type: string;
        severity: 'error' | 'warning' | 'info';
        entityType: 'TEAM' | 'DEPARTMENT' | 'PERSON' | 'POSITION';
        entityId: string;
        entityName: string;
        explanation: string;
        fixUrl: string;
        fixAction: string;
      }>;
      updatedCoverage: {
        coverage: {
          teams: { total: number; owned: number; unowned: number };
          departments: { total: number; owned: number; unowned: number };
        };
        unowned: Array<{
          entityType: "TEAM" | "DEPARTMENT";
          entityId: string;
          name: string;
        }>;
        assignments: Array<{
          id: string;
          entityType: "TEAM" | "DEPARTMENT";
          entityId: string;
          owner: { id: string; fullName: string };
        }>;
      };
      issuesVersion: number;
    }>("/api/org/ownership/assign", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Structure mutations
  createDepartment: (payload: { name: string }) =>
    api<{ id: string; name: string }>("/api/org/structure/departments/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createTeam: (payload: { name: string; departmentId: string | null }) =>
    api<{ id: string; name: string; departmentId: string }>("/api/org/structure/teams/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  setTeamOwner: (teamId: string, payload: { ownerPersonId: string | null }) =>
    api<MutationResponse<{ id: string; ownerPersonId: string | null }, OwnershipPatch>>(`/api/org/structure/teams/${teamId}/owner`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setDepartmentOwner: (departmentId: string, payload: { ownerPersonId: string | null }) =>
    api<MutationResponse<{ id: string; ownerPersonId: string | null }, OwnershipPatch>>(`/api/org/structure/departments/${departmentId}/owner`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  addTeamMember: (teamId: string, payload: { personId: string }) =>
    api<{ id: string }>(`/api/org/structure/teams/${teamId}/members/add`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  removeTeamMember: (teamId: string, payload: { personId: string }) =>
    api<{ ok: boolean }>(`/api/org/structure/teams/${teamId}/members/remove`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Intelligence snapshots
  getLatestIntelligenceSnapshot: () =>
    api<OrgLatestIntelligenceSnapshotDTO>("/api/org/intelligence/snapshots/latest"),

  listIntelligenceSnapshots: () =>
    api<{
      snapshots: Array<{
        id: string;
        createdAt: string;
        source: string;
        findingCount: number;
        rollups: OrgIntelligenceRollups | null;
      }>;
    }>("/api/org/intelligence/snapshots"),

  getIntelligenceSnapshot: (id: string) =>
    api<{
      id: string;
      createdAt: string;
      source: string;
      findingCount: number;
      findings: OrgIntelligenceFinding[];
      rollups: OrgIntelligenceRollups | null;
    }>(`/api/org/intelligence/snapshots/${id}`),

  getIntelligenceSettings: () => {
    // Return cached settings if still valid
    const now = Date.now();
    if (
      intelligenceSettingsCache.data &&
      now - intelligenceSettingsCache.timestamp < INTELLIGENCE_SETTINGS_CACHE_TTL_MS
    ) {
      return Promise.resolve(intelligenceSettingsCache.data);
    }

    // Fetch and cache
    return api<{
      settings: {
        mgmtMediumDirectReports: number;
        mgmtHighDirectReports: number;
        availabilityStaleDays: number;
        snapshotFreshMinutes: number;
        snapshotWarnMinutes: number;
        schemaVersion: number;
      };
    }>("/api/org/intelligence/settings").then((data) => {
      intelligenceSettingsCache = { data, timestamp: now };
      return data;
    });
  },

  updateIntelligenceSettings: (payload: {
    mgmtMediumDirectReports: number;
    mgmtHighDirectReports: number;
    availabilityStaleDays: number;
    snapshotFreshMinutes?: number;
    snapshotWarnMinutes?: number;
  }) =>
    api<{ ok: true }>("/api/org/intelligence/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  createIntelligenceSnapshot: () =>
    api<{ id: string; createdAt: string; findingCount: number }>(
      "/api/org/intelligence/snapshots/create",
      { method: "POST" }
    ),

  getLatestRecommendations: () =>
    api<{
      snapshot: null | { id: string; createdAt: string };
      recommendations: OrgRecommendation[];
    }>("/api/org/intelligence/recommendations/latest"),

  /**
   * Phase R: Get AI-driven recommendations for org health improvements.
   * Pure derivation from Phase S snapshot signals.
   */
  getReasoning: (options?: { limit?: number }) =>
    api<OrgReasoningResultDTO>(
      `/api/org/reasoning${options?.limit !== undefined ? `?limit=${options.limit}` : ""}`
    ),

  getIntelligenceFilterPrefs: () =>
    api<{ key: string; value: OrgIntelligenceFilterPrefs | null }>(
      "/api/org/preferences"
    ),

  setIntelligenceFilterPrefs: (value: OrgIntelligenceFilterPrefs) =>
    api<{ ok: true }>("/api/org/preferences", {
      method: "PUT",
      body: JSON.stringify(value),
    }),

  // Integrity checks
  updateIssueResolution: (payload: {
    entityType: "person" | "team" | "department" | "position";
    entityId: string;
    issueType: string;
    resolution: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";
    resolutionNote?: string;
  }) =>
    api<{
      ok: boolean;
      issue?: {
        id: string;
        resolution: string;
        resolutionNote: string | null;
        resolvedById: string | null;
        resolvedAt: string | null;
      };
      persisted: boolean;
      warning?: string;
    }>("/api/org/integrity/resolution", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getIntegrity: (params?: { resolution?: string; includeResolved?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.resolution) searchParams.set("resolution", params.resolution);
    if (params?.includeResolved) searchParams.set("includeResolved", "true");
    const query = searchParams.toString();
    const url = query ? `/api/org/integrity?${query}` : "/api/org/integrity";
    
    return api<{
      ok: boolean;
      totalIssues: number;
      issues: Array<{
        issueKey: string;
        type: string;
        entityType: "person" | "team" | "department" | "position";
        entityId: string;
        entityName: string;
        severity: "error" | "warning";
        message: string;
        fixUrl?: string;
        resolution: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";
        resolutionNote: string | null;
        resolvedById: string | null;
        resolvedByName: string | null;
        resolvedAt: string | null;
        firstSeenAt: string | null;
      }>;
      summary: {
        person_missing_team: number;
        person_missing_department: number;
        person_missing_manager: number;
        team_missing_department: number;
        team_missing_owner: number;
        department_missing_owner: number;
        manager_cycle: number;
      };
    }>(url);
  },

  // Availability & Employment HRIS-Lite
  getPersonAvailabilityWindows: (personId: string) =>
    api<{
      ok: boolean;
      windows: Array<{
        id: string;
        type: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL";
        startDate: string;
        endDate: string | null;
        fraction: number | null;
        reason: string | null;
        expectedReturnDate: string | null;
        note: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/api/org/people/${personId}/availability-windows`),

  getPersonDerivedAvailability: (personId: string) =>
    api<{
      ok: boolean;
      derived: {
        personId: string;
        employmentStatus: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "CONTRACTOR";
        status: "available" | "partial" | "unavailable";
        label: "Available" | "Limited" | "Unavailable";
        fraction: number;
        reason: string | null;
        expectedReturnDate: string | null;
        isWorking: boolean;
        computedAt: string;
      };
    }>(`/api/org/people/${personId}/availability-derived`),

  updateEmploymentStatus: (
    personId: string,
    payload: {
      employmentStatus?: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "CONTRACTOR";
      employmentStartDate?: string | null;
      employmentEndDate?: string | null;
    }
  ) =>
    api<{
      ok: boolean;
      userId: string;
      employmentStatus: string;
      employmentStartDate: string | null;
      employmentEndDate: string | null;
    }>(`/api/org/people/${personId}/employment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  createAvailabilityWindow: (
    personId: string,
    payload: {
      startDate: string;
      endDate?: string | null;
      type?: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL";
      fraction?: number | null;
      reason?: string | null;
      expectedReturnDate?: string | null;
      note?: string | null;
    }
  ) =>
    api<{
      ok: boolean;
      window: {
        id: string;
        type: string;
        startDate: string;
        endDate: string | null;
        fraction: number | null;
        reason: string | null;
        expectedReturnDate: string | null;
        note: string | null;
      };
    }>(`/api/org/people/${personId}/availability-windows`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAvailabilityWindow: (
    personId: string,
    windowId: string,
    payload: {
      startDate?: string;
      endDate?: string | null;
      type?: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL";
      fraction?: number | null;
      reason?: string | null;
      expectedReturnDate?: string | null;
      note?: string | null;
    }
  ) =>
    api<{
      ok: boolean;
      window: {
        id: string;
        type: string;
        startDate: string;
        endDate: string | null;
        fraction: number | null;
        reason: string | null;
        expectedReturnDate: string | null;
        note: string | null;
      };
    }>(`/api/org/people/${personId}/availability-windows/${windowId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteAvailabilityWindow: (personId: string, windowId: string) =>
    api<{ ok: boolean }>(
      `/api/org/people/${personId}/availability-windows/${windowId}`,
      { method: "DELETE" }
    ),

  getStructureAvailabilityRollups: () =>
    api<{
      ok: boolean;
      teams: Record<
        string,
        {
          availableCount: number;
          partialCount: number;
          unavailableCount: number;
          totalMembers: number;
        }
      >;
      departments: Record<
        string,
        {
          availableCount: number;
          partialCount: number;
          unavailableCount: number;
          totalMembers: number;
        }
      >;
      computedAt: string;
    }>("/api/org/structure/availability"),

  // Skills Taxonomy
  listSkills: (params?: { q?: string; category?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    const url = query ? `/api/org/skills?${query}` : "/api/org/skills";

    return api<{
      ok: boolean;
      skills: Array<{
        id: string;
        name: string;
        category: string | null;
        description: string | null;
        personCount: number;
      }>;
    }>(url);
  },

  createSkill: (payload: { name: string; category?: string | null; description?: string | null }) =>
    api<{
      ok: boolean;
      skill: { id: string; name: string; category: string | null; description: string | null };
      created: boolean;
      message?: string;
    }>("/api/org/skills", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSkill: (skillId: string, payload: { name?: string; category?: string | null; description?: string | null }) =>
    api<{
      ok: boolean;
      skill: { id: string; name: string; category: string | null; description: string | null };
    }>(`/api/org/skills/${skillId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteSkill: (skillId: string) =>
    api<{ ok: boolean }>(`/api/org/skills/${skillId}`, { method: "DELETE" }),

  // Person Skills
  getPersonSkills: (personId: string) =>
    api<{
      ok: boolean;
      skills: Array<{
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        proficiency: number;
        source: string;
        verifiedAt: string | null;
      }>;
    }>(`/api/org/people/${personId}/skills`),

  addPersonSkill: (
    personId: string,
    payload: {
      skillId: string;
      proficiency?: number;
      source?: "SELF_REPORTED" | "MANAGER_ADDED" | "VERIFIED" | "INFERRED";
    }
  ) =>
    api<{
      ok: boolean;
      personSkill: {
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        proficiency: number;
        source: string;
        verifiedAt: string | null;
      };
    }>(`/api/org/people/${personId}/skills`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePersonSkill: (
    personId: string,
    personSkillId: string,
    payload: {
      proficiency?: number;
      source?: "SELF_REPORTED" | "MANAGER_ADDED" | "VERIFIED" | "INFERRED";
      verifiedAt?: string | null;
    }
  ) =>
    api<{
      ok: boolean;
      personSkill: {
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        proficiency: number;
        source: string;
        verifiedAt: string | null;
      };
    }>(`/api/org/people/${personId}/skills/${personSkillId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  removePersonSkill: (personId: string, personSkillId: string) =>
    api<{ ok: boolean }>(`/api/org/people/${personId}/skills/${personSkillId}`, {
      method: "DELETE",
    }),

  // Role Card Skills
  getRoleCardSkills: (roleCardId: string) =>
    api<{
      ok: boolean;
      skills: Array<{
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        type: "REQUIRED" | "PREFERRED";
        minProficiency: number | null;
      }>;
    }>(`/api/org/role-cards/${roleCardId}/skills`),

  addRoleCardSkill: (
    roleCardId: string,
    payload: {
      skillId: string;
      type: "REQUIRED" | "PREFERRED";
      minProficiency?: number | null;
    }
  ) =>
    api<{
      ok: boolean;
      roleCardSkill: {
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        type: "REQUIRED" | "PREFERRED";
        minProficiency: number | null;
      };
    }>(`/api/org/role-cards/${roleCardId}/skills`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRoleCardSkill: (
    roleCardId: string,
    roleCardSkillId: string,
    payload: {
      type?: "REQUIRED" | "PREFERRED";
      minProficiency?: number | null;
    }
  ) =>
    api<{
      ok: boolean;
      roleCardSkill: {
        id: string;
        skillId: string;
        skill: { id: string; name: string; category: string | null };
        type: "REQUIRED" | "PREFERRED";
        minProficiency: number | null;
      };
    }>(`/api/org/role-cards/${roleCardId}/skills/${roleCardSkillId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  removeRoleCardSkill: (roleCardId: string, roleCardSkillId: string) =>
    api<{ ok: boolean }>(`/api/org/role-cards/${roleCardId}/skills/${roleCardSkillId}`, {
      method: "DELETE",
    }),
};

