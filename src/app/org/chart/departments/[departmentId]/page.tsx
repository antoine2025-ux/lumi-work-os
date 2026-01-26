import { notFound } from "next/navigation"
import Link from "next/link"
import { getOrgPermissionContext } from "@/lib/org/permissions.server"
import { prisma } from "@/lib/db"
import { orgTokens } from "@/components/org/ui/tokens"
import { DepartmentDetailView } from "@/components/org/chart/DepartmentDetailView"

export default async function DepartmentDrillInPage(props: { params: { departmentId: string } }) {
  const departmentId = props.params.departmentId
  if (!departmentId) notFound()

  const context = await getOrgPermissionContext()
  if (!context) {
    return (
      <div className={orgTokens.page}>
        <div className="text-sm text-muted-foreground">No organization selected.</div>
      </div>
    )
  }

  const workspaceId = context.orgId

  // Load department from database
  const department = await prisma.orgDepartment.findFirst({
    where: { id: departmentId, workspaceId, isActive: true },
    select: {
      id: true,
      name: true,
    },
  })

  if (!department) {
    notFound()
  }

  // Load teams for this department
  const teams = await prisma.orgTeam.findMany({
    where: { workspaceId, departmentId, isActive: true },
    select: {
      id: true,
      name: true,
      departmentId: true,
    },
    orderBy: { name: "asc" },
  })

  // Map to StructureTeam format for DepartmentDetailView
  const departmentTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    departmentId: team.departmentId,
    departmentName: null,
    leadName: null,
    memberCount: 0, // Will be 0 until membership mapping exists
  }))

  // Map to StructureDepartment format
  const departmentForView = {
    id: department.id,
    name: department.name,
    teamCount: teams.length,
  }

  return (
    <div className="px-10 pb-10">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/org/chart" className="hover:text-foreground transition-colors">
          Org chart
        </Link>
        <span>/</span>
        <span className="text-foreground">{department.name}</span>
      </div>

      {/* Department detail */}
      <DepartmentDetailView 
        department={departmentForView}
        teams={departmentTeams}
        canManageStructure={false}
      />
    </div>
  )
}

