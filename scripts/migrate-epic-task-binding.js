#!/usr/bin/env node

/**
 * Epic-Task Binding Migration Script
 * 
 * This script helps backfill epicId for existing tasks that were created
 * from Epic contexts but don't have the epicId properly set.
 * 
 * Since we don't have historical context about which tasks were created
 * from which Epic views, this script provides a manual way to assign
 * tasks to Epics based on patterns or manual selection.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Epic-Task Binding Migration Script')
  console.log('=====================================\n')

  try {
    // Get all projects with their epics and tasks
    const projects = await prisma.project.findMany({
      include: {
        epics: {
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          where: {
            epicId: null // Only tasks without epicId
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    console.log(`Found ${projects.length} projects to analyze\n`)

    for (const project of projects) {
      console.log(`📁 Project: ${project.name}`)
      console.log(`   Epics: ${project.epics.length}`)
      console.log(`   Unassigned Tasks: ${project.tasks.length}`)

      if (project.tasks.length === 0) {
        console.log('   ✅ No unassigned tasks\n')
        continue
      }

      if (project.epics.length === 0) {
        console.log('   ⚠️  No epics found - tasks will remain unassigned\n')
        continue
      }

      // Show available epics
      console.log('\n   Available Epics:')
      project.epics.forEach((epic, index) => {
        console.log(`   ${index + 1}. ${epic.title} (${epic.color || '#3B82F6'})`)
      })

      // Show unassigned tasks
      console.log('\n   Unassigned Tasks:')
      project.tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} (${task.status})`)
      })

      // For now, we'll leave tasks unassigned since we don't have
      // enough context to automatically assign them
      console.log('\n   ℹ️  Tasks left unassigned - manual assignment recommended')
      console.log('   💡 Use the Epic filter in the UI to manually assign tasks to epics\n')
    }

    // Provide summary
    const totalUnassignedTasks = projects.reduce((sum, project) => sum + project.tasks.length, 0)
    const totalEpics = projects.reduce((sum, project) => sum + project.epics.length, 0)

    console.log('📊 Summary:')
    console.log(`   Total Projects: ${projects.length}`)
    console.log(`   Total Epics: ${totalEpics}`)
    console.log(`   Unassigned Tasks: ${totalUnassignedTasks}`)
    console.log('\n✅ Migration analysis complete!')
    console.log('\n💡 Next Steps:')
    console.log('   1. Use the Epic filter in the project UI to view tasks by Epic')
    console.log('   2. Manually assign tasks to Epics using the task edit dialog')
    console.log('   3. Create new tasks from Epic contexts - they will auto-assign correctly')

  } catch (error) {
    console.error('❌ Error during migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
