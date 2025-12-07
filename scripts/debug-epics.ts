/**
 * Temporary debug script to verify epics exist in DB
 * Run with: npx tsx scripts/debug-epics.ts
 */

import { prisma } from '../src/lib/db'

async function debugEpics() {
  try {
    const project = await prisma.project.findFirst({
      where: { name: "Loopwell Project Management Revamp" },
      select: { id: true, name: true, workspaceId: true },
    })

    console.log("Revamp project:", project)

    if (!project) {
      console.log("Project not found!")
      return
    }

    const epics = await prisma.epic.findMany({
      where: { projectId: project.id },
      select: { id: true, title: true, projectId: true, workspaceId: true },
    })

    console.log("Epics for revamp project:", epics)
    console.log("Epic count:", epics.length)
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

debugEpics()



