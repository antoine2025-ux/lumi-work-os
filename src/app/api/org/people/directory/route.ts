import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspaceId } from "@/server/workspace/context"
import { listWorkspaceMemberships } from "@/server/org/people/membershipDelegate"
import { getProfileOverride } from "@/server/org/people/profileOverrides"

export async function GET(req: Request) {
  try {
    const workspaceId = await requireWorkspaceId()
    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim().toLowerCase()
    const teamId = url.searchParams.get("teamId")
    const departmentId = url.searchParams.get("departmentId")
    const availability = url.searchParams.get("availability") // AVAILABLE | LIMITED | UNAVAILABLE

    // Base sets
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    const teams = await prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true },
    })

    // Get workspace memberships (canonical source)
    const { delegateName, rows: memberships } = await listWorkspaceMemberships(workspaceId)

    let peopleBase: Array<{ personKey: string; userId: string; name: string | null; email: string | null }> = []

    if (memberships) {
      const userIds = memberships.map((m) => m.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })

      const byId = new Map(users.map((u) => [u.id, u]))
      peopleBase = memberships
        .map((m) => {
          const u = byId.get(m.userId)
          if (!u) return null
          return { personKey: m.id, userId: u.id, name: u.name, email: u.email }
        })
        .filter((x): x is { personKey: string; userId: string; name: string | null; email: string | null } => x !== null)
    } else {
      // Fallback: users (not workspace scoped). Keep until membership exists.
      const users = await prisma.user.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, email: true },
        take: 2000,
      })
      peopleBase = users.map((u) => ({ personKey: u.id, userId: u.id, name: u.name, email: u.email }))
    }

    // Get positions for these users to map role/team/department
    const userIds = peopleBase.map((p) => p.userId)
    const positions = await prisma.orgPosition.findMany({
      where: {
        userId: { in: userIds },
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
        title: true,
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Map positions to users (take first active position per user for now)
    const positionByUserId = new Map<string, typeof positions[0]>()
    for (const pos of positions) {
      if (pos.userId && !positionByUserId.has(pos.userId)) {
        positionByUserId.set(pos.userId, pos)
      }
    }

    // Fetch profile overrides for these users (if model exists)
    let overrides: Array<{ userId: string; title: string | null; availability: string | null; departmentId: string | null; teamIds: string[] }> = []
    let overrideByUserId = new Map<string, { userId: string; title: string | null; availability: string | null; departmentId: string | null; teamIds: string[] }>()
    
    try {
      // Check if model exists in Prisma client (may not exist until server restart after schema change)
      const prismaAny = prisma as any
      if (prismaAny.orgPersonProfileOverride && typeof prismaAny.orgPersonProfileOverride.findMany === 'function') {
        overrides = await prismaAny.orgPersonProfileOverride.findMany({
          where: { workspaceId, userId: { in: userIds } },
        })
        overrideByUserId = new Map(overrides.map((o: any) => [o.userId, o]))
      }
    } catch (e: any) {
      // Model not available yet - will work after dev server restarts
      console.warn("[directory] orgPersonProfileOverride not available yet (restart dev server):", e?.message || e)
    }

    // Create team lookup map (teams already fetched above)
    const teamById = new Map(teams.map((t) => [t.id, { id: t.id, name: t.name }]))

    // Build rows with personKey + userId explicitly, merging override data
    const rows = peopleBase.map((p) => {
      const pos = positionByUserId.get(p.userId)
      const override = overrideByUserId.get(p.userId)

      // Prefer override title over position title
      const role = override?.title ?? pos?.title ?? null

      // Prefer override department, else position department
      let department = null
      if (override?.departmentId) {
        const dept = departments.find((d) => d.id === override.departmentId)
        if (dept) {
          department = { id: dept.id, name: dept.name }
        }
      } else if (pos?.team?.department) {
        department = {
          id: pos.team.department.id,
          name: pos.team.department.name,
        }
      }

      // Prefer override teams (first team from teamIds), else position team
      let team = null
      if (override?.teamIds && override.teamIds.length > 0) {
        const teamFromOverride = teamById.get(override.teamIds[0])
        if (teamFromOverride) {
          team = { id: teamFromOverride.id, name: teamFromOverride.name }
        }
      } else if (pos?.team) {
        team = { id: pos.team.id, name: pos.team.name }
      }

      return {
        personKey: p.personKey, // Canonical identifier (workspace membership id or user id)
        userId: p.userId, // Reference to user table
        name: p.name,
        email: p.email,
        role,
        department,
        team,
        availability: override?.availability ?? null,
      }
    })

    // Apply search filter (q) - case-insensitive name/email match
    let filtered = rows
    if (q) {
      filtered = filtered.filter((r) => {
        const nameMatch = r.name?.toLowerCase().includes(q)
        const emailMatch = r.email?.toLowerCase().includes(q)
        return nameMatch || emailMatch
      })
    }

    // Apply other filters best-effort
    if (availability) {
      // Filter by availability (will work once availability is wired)
      filtered = filtered.filter((r) => r.availability === availability)
    }
    if (teamId) {
      filtered = filtered.filter((r) => r.team?.id === teamId)
    }
    if (departmentId) {
      filtered = filtered.filter((r) => r.department?.id === departmentId)
    }

    // Dev-only debug metadata
    const debug = process.env.NODE_ENV === "development"
      ? {
          membershipDelegate: delegateName,
          membershipCount: memberships ? memberships.length : null,
          mode: memberships ? "membership" : "users_fallback",
        }
      : undefined

    return NextResponse.json({
      departments,
      teams,
      people: filtered,
      meta: {
        totalPeople: rows.length,
        visiblePeople: filtered.length,
      },
      ...(debug ? { debug } : {}),
    })
  } catch (error: any) {
    console.error("[GET /api/org/people/directory] Error:", error)
    
    // Return a more informative error response
    const errorMessage = error?.message || "Failed to load directory"
    const statusCode = error?.status || 500
    
    return NextResponse.json(
      { 
        error: "Failed to load directory", 
        detail: errorMessage,
        // Include stack trace in dev for debugging
        ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
      },
      { status: statusCode }
    )
  }
}

