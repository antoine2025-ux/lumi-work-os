import { useParams } from 'next/navigation'

/**
 * Hook for building workspace-scoped org URLs in client components.
 * Eliminates hardcoded /org/ links and ensures workspace-aware navigation.
 * 
 * @throws Error if used outside workspace-scoped routes (missing workspaceSlug param)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const orgUrl = useOrgUrl()
 *   return (
 *     <Link href={orgUrl.directory}>Directory</Link>
 *     <Link href={orgUrl.person('123')}>Person Profile</Link>
 *   )
 * }
 * ```
 */
export function useOrgUrl() {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string | undefined

  if (!workspaceSlug) {
    throw new Error('useOrgUrl must be used within workspace-scoped routes')
  }

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
