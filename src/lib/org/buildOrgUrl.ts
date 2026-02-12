/**
 * Server-side org URL builder for use in Server Components and API routes.
 * Generates workspace-scoped org URLs.
 * 
 * @example
 * ```tsx
 * // Simple path
 * const url = buildOrgUrl('acme', 'directory')
 * // => '/w/acme/org/directory'
 * 
 * // Full builder object
 * const urls = buildOrgUrls('acme')
 * const directoryUrl = urls.directory
 * const personUrl = urls.person('123')
 * ```
 */

/**
 * Build a single org URL path.
 */
export function buildOrgUrl(workspaceSlug: string, subPath?: string): string {
  const base = `/w/${workspaceSlug}/org`
  return subPath ? `${base}/${subPath}` : base
}

/**
 * Build an object with all org URL helpers.
 * Mirrors the structure of useOrgUrl hook for consistency.
 */
export function buildOrgUrls(workspaceSlug: string) {
  const base = `/w/${workspaceSlug}/org`
  
  return {
    /** Base org URL: /w/[slug]/org */
    base,
    
    /** Build org sub-path URL */
    path: (subPath: string) => `${base}/${subPath}`,
    
    /** Common org routes */
    directory: `${base}/directory`,
    structure: `${base}/structure`,
    chart: `${base}/chart`,
    profile: `${base}/profile`,
    myTeam: `${base}/my-team`,
    myDepartment: `${base}/my-department`,
    admin: `${base}/admin`,
    adminHealth: `${base}/admin/health`,
    adminDecisions: `${base}/admin/decisions`,
    adminResponsibility: `${base}/admin/responsibility`,
    adminCapacity: `${base}/admin/capacity`,
    adminSettings: `${base}/admin/settings`,
    positions: `${base}/positions`,
    intelligence: `${base}/intelligence`,
    intelligenceDrilldowns: `${base}/intelligence/drilldowns`,
    ownership: `${base}/ownership`,
    activity: `${base}/activity`,
    
    /** Build person profile URL */
    person: (personId: string) => `${base}/people/${personId}`,
    
    /** Build new person URL */
    newPerson: `${base}/people/new`,
    
    /** Build team detail URL */
    team: (teamId: string) => `${base}/structure/teams/${teamId}`,
    
    /** Build department detail URL */
    department: (deptId: string) => `${base}/structure/departments/${deptId}`,
  }
}
