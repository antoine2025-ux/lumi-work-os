#!/usr/bin/env node

/**
 * Epic-Task Assignment Helper Script
 * 
 * This script provides utilities to help manually assign tasks to Epics
 * when the automatic binding wasn't possible.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function assignTaskToEpic(taskId, epicId) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { epicId },
      include: {
        epic: true,
        project: true
      }
    })

    console.log(`✅ Task "${task.title}" assigned to Epic "${task.epic?.title}"`)
    return task
  } catch (error) {
    console.error(`❌ Failed to assign task ${taskId} to epic ${epicId}:`, error.message)
    throw error
  }
}

async function listTasksWithoutEpic(projectId) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        epicId: null
      },
      include: {
        project: true,
        assignee: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n📋 Unassigned Tasks in Project ${projectId}:`)
    console.log('==========================================')
    
    if (tasks.length === 0) {
      console.log('✅ All tasks are assigned to Epics!')
      return []
    }

    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`)
      console.log(`   ID: ${task.id}`)
      console.log(`   Status: ${task.status}`)
      console.log(`   Assignee: ${task.assignee?.name || 'Unassigned'}`)
      console.log(`   Created: ${task.createdAt.toISOString().split('T')[0]}`)
      console.log('')
    })

    return tasks
  } catch (error) {
    console.error('❌ Failed to list tasks:', error.message)
    throw error
  }
}

async function listEpics(projectId) {
  try {
    const epics = await prisma.epic.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`\n🎯 Available Epics in Project ${projectId}:`)
    console.log('=========================================')
    
    if (epics.length === 0) {
      console.log('⚠️  No Epics found in this project')
      return []
    }

    epics.forEach((epic, index) => {
      console.log(`${index + 1}. ${epic.title}`)
      console.log(`   ID: ${epic.id}`)
      console.log(`   Color: ${epic.color || '#3B82F6'}`)
      console.log(`   Tasks: ${epic._count.tasks}`)
      console.log(`   Created: ${epic.createdAt.toISOString().split('T')[0]}`)
      console.log('')
    })

    return epics
  } catch (error) {
    console.error('❌ Failed to list epics:', error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('🔧 Epic-Task Assignment Helper')
    console.log('============================\n')
    console.log('Usage:')
    console.log('  node scripts/epic-task-helper.js list-tasks <projectId>')
    console.log('  node scripts/epic-task-helper.js list-epics <projectId>')
    console.log('  node scripts/epic-task-helper.js assign <taskId> <epicId>')
    console.log('\nExamples:')
    console.log('  node scripts/epic-task-helper.js list-tasks cmgy1kmyb00038oyfup2r1jg6')
    console.log('  node scripts/epic-task-helper.js assign cmgz69dq20003pffdihndyben epic123')
    return
  }

  const command = args[0]

  try {
    switch (command) {
      case 'list-tasks':
        if (args.length < 2) {
          console.error('❌ Please provide a projectId')
          return
        }
        await listTasksWithoutEpic(args[1])
        break

      case 'list-epics':
        if (args.length < 2) {
          console.error('❌ Please provide a projectId')
          return
        }
        await listEpics(args[1])
        break

      case 'assign':
        if (args.length < 3) {
          console.error('❌ Please provide taskId and epicId')
          return
        }
        await assignTaskToEpic(args[1], args[2])
        break

      default:
        console.error(`❌ Unknown command: ${command}`)
        console.log('Available commands: list-tasks, list-epics, assign')
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
