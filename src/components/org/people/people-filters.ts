export type QuickChip = "all" | "leaders" | "unassigned" | "new" | "recentlyChanged";

export type PeopleFilters = {
  // Search
  q?: string;

  // Quick chips
  quickChip?: QuickChip;

  // Advanced filters
  teamId?: string;
  departmentId?: string;
  roleId?: string;
  managerId?: string;

  // Flags
  leadersOnly?: boolean;
  unassignedOnly?: boolean;
  recentlyChanged?: boolean;

  // Sorting
  sort?: "name" | "joinedAt" | "role";
  direction?: "asc" | "desc";
};

export function parsePeopleFiltersFromSearchParams(
  searchParams: URLSearchParams
): PeopleFilters {
  const teamId = searchParams.get("teamId") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const roleId = searchParams.get("roleId") || undefined;
  const managerId = searchParams.get("managerId") || undefined;
  const q = searchParams.get("q") || undefined;

  const quickChipParam = searchParams.get("quickChip") || undefined;
  const quickChip: QuickChip | undefined =
    quickChipParam === "all" ||
    quickChipParam === "leaders" ||
    quickChipParam === "unassigned" ||
    quickChipParam === "new" ||
    quickChipParam === "recentlyChanged"
      ? quickChipParam
      : undefined;

  const leadersOnly = searchParams.get("leadersOnly") === "true";
  const unassignedOnly = searchParams.get("unassignedOnly") === "true";
  const recentlyChanged = searchParams.get("recentlyChanged") === "true";

  const sortParam = searchParams.get("sort") || undefined;
  const directionParam = searchParams.get("direction") || undefined;

  const sort =
    sortParam === "name" || sortParam === "joinedAt" || sortParam === "role"
      ? sortParam
      : undefined;

  const direction =
    directionParam === "asc" || directionParam === "desc"
      ? directionParam
      : undefined;

  return {
    q,
    quickChip,
    teamId,
    departmentId,
    roleId,
    managerId,
    leadersOnly: leadersOnly || undefined,
    unassignedOnly: unassignedOnly || undefined,
    recentlyChanged: recentlyChanged || undefined,
    sort,
    direction,
  };
}

export function hasAnyPeopleFilter(filters: PeopleFilters): boolean {
  return !!(
    filters.q ||
    (filters.quickChip && filters.quickChip !== "all") ||
    filters.teamId ||
    filters.departmentId ||
    filters.roleId ||
    filters.managerId ||
    filters.leadersOnly ||
    filters.unassignedOnly ||
    filters.recentlyChanged
  );
}

export function buildPeopleFiltersURL(filters: PeopleFilters): string {
  const params = new URLSearchParams();
  
  if (filters.q) params.set("q", filters.q);
  if (filters.quickChip && filters.quickChip !== "all") params.set("quickChip", filters.quickChip);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.roleId) params.set("roleId", filters.roleId);
  if (filters.managerId) params.set("managerId", filters.managerId);
  if (filters.leadersOnly) params.set("leadersOnly", "true");
  if (filters.unassignedOnly) params.set("unassignedOnly", "true");
  if (filters.recentlyChanged) params.set("recentlyChanged", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.direction) params.set("direction", filters.direction);

  return params.toString();
}

