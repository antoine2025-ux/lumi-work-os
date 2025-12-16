/**
 * Temporary script to verify epics have correct projectId and workspaceId
 * Run with: npx tsx scripts/verify-epics.ts
 */

import { prisma } from '../src/lib/db'

async function verifyEpics() {
  try {
    // Find the project
    const project = await prisma.project.findFirst({
      where: { name: "Loopwell Project Management Revamp" },
      select: { id: true, name: true, workspaceId: true },
    })

    if (!project) {
      console.log("Project not found!")
      return
    }

    console.log("Project:", project)

    // Get all epics for this project
    const epics = await prisma.epic.findMany({
      where: { projectId: project.id },
      select: { 
        id: true, 
        title: true, 
        projectId: true, 
        workspaceId: true 
      },
    })

    console.log("\nEpics for project:")
    console.log("Count:", epics.length)
    epics.forEach(epic => {
      console.log(`- ${epic.title}`)
      console.log(`  ID: ${epic.id}`)
      console.log(`  projectId: ${epic.projectId} (matches: ${epic.projectId === project.id})`)
      console.log(`  workspaceId: ${epic.workspaceId} (matches: ${epic.workspaceId === project.workspaceId})`)
    })

    // Check for epics with wrong projectId
    const wrongEpics = await prisma.epic.findMany({
      where: {
        workspaceId: project.workspaceId,
        projectId: { not: project.id }
      },
      select: { id: true, title: true, projectId: true },
    })

    if (wrongEpics.length > 0) {
      console.log("\n⚠️  Found epics in same workspace but different project:")
      wrongEpics.forEach(epic => {
        console.log(`- ${epic.title} (projectId: ${epic.projectId})`)
      })
    }

    // Check tasks linked to epics
    const tasksWithEpics = await prisma.task.findMany({
      where: {
        projectId: project.id,
        epicId: { not: null }
      },
      select: {
        id: true,
        title: true,
        epicId: true,
        epic: {
          select: {
            id: true,
            title: true,
            projectId: true
          }
        }
      },
      take: 10
    })

    console.log("\nTasks with epics (first 10):")
    tasksWithEpics.forEach(task => {
      console.log(`- ${task.title}`)
      console.log(`  epicId: ${task.epicId}`)
      if (task.epic) {
        console.log(`  epic.projectId: ${task.epic.projectId} (matches: ${task.epic.projectId === project.id})`)
      }
    })
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyEpics()




