import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"
import { FileText, Users, BookOpen, Hash, AtSign } from "lucide-react"

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const query = request.nextUrl.searchParams.get("q")
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.toLowerCase()

    // Parse search operators
    const operators = {
      project: query.match(/#(\w+)/g)?.map(m => m.slice(1)) || [],
      user: query.match(/@(\w+)/g)?.map(m => m.slice(1)) || [],
      status: query.match(/status:(\w+)/g)?.map(m => m.slice(7)) || [],
      tag: query.match(/tag:(\w+)/g)?.map(m => m.slice(4)) || [],
      in: query.match(/in:(\w+)/g)?.map(m => m.slice(3)) || []
    }

    const results = []

    // Search projects
    if (operators.in.length === 0 || operators.in.includes("project")) {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } }
          ],
          ...(operators.project.length > 0 && {
            name: { in: operators.project }
          })
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          color: true
        },
        take: 5
      })

      results.push(...projects.map(project => ({
        id: project.id,
        title: project.name,
        description: project.description || `Status: ${project.status}`,
        type: "project" as const,
        url: `/projects/${project.id}`,
        icon: FileText,
        color: project.color
      })))
    }

    // Search tasks
    if (operators.in.length === 0 || operators.in.includes("task")) {
      const tasks = await prisma.task.findMany({
        where: {
          workspaceId: auth.workspaceId,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } }
          ],
          ...(operators.status.length > 0 && {
            status: { in: operators.status }
          }),
          ...(operators.tag.length > 0 && {
            tags: { hasSome: operators.tag }
          })
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          project: {
            select: { name: true, color: true }
          }
        },
        take: 5
      })

      results.push(...tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: `${task.project.name} • ${task.status} • ${task.priority}`,
        type: "task" as const,
        url: `/projects/${task.project.id}?task=${task.id}`,
        icon: FileText,
        color: task.project.color
      })))
    }

    // Search wiki pages
    if (operators.in.length === 0 || operators.in.includes("wiki")) {
      const wikiPages = await prisma.wikiPage.findMany({
        where: {
          workspaceId: auth.workspaceId,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { content: { contains: searchTerm, mode: "insensitive" } },
            { excerpt: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          category: true
        },
        take: 5
      })

      results.push(...wikiPages.map(page => ({
        id: page.id,
        title: page.title,
        description: page.excerpt || `Category: ${page.category}`,
        type: "wiki" as const,
        url: `/wiki/${page.id}`,
        icon: BookOpen
      })))
    }

    // Search users
    if (operators.in.length === 0 || operators.in.includes("user") || operators.user.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          workspaceMemberships: {
            some: { workspaceId: auth.workspaceId }
          },
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            ...(operators.user.length > 0 ? [
              { name: { in: operators.user } },
              { email: { in: operators.user } }
            ] : [])
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        },
        take: 5
      })

      results.push(...users.map(user => ({
        id: user.id,
        title: user.name || user.email,
        description: user.email,
        type: "user" as const,
        url: `/users/${user.id}`,
        icon: Users,
        image: user.image
      })))
    }

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(searchTerm)
      const bExact = b.title.toLowerCase().includes(searchTerm)
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      return a.title.localeCompare(b.title)
    })

    return NextResponse.json({ results: results.slice(0, 10) })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
