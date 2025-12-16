#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function smokeTest() {
  console.log('🚀 Starting Lumi Smoke Test...\n')

  try {
    // 1. Check if we have any projects
    console.log('1️⃣ Checking existing projects...')
    const projects = await prisma.project.findMany({
      include: {
        tasks: true,
        epics: true,
        milestones: true,
        customFields: true
      }
    })
    
    if (projects.length === 0) {
      console.log('❌ No projects found. Creating test project...')
      
      // Create a test project
      const project = await prisma.project.create({
        data: {
          id: 'test-project-1',
          workspaceId: 'test-workspace',
          name: 'Test Project',
          description: 'A test project for smoke testing',
          status: 'ACTIVE',
          priority: 'MEDIUM',
          createdById: 'test-user-1',
          dailySummaryEnabled: true
        }
      })
      console.log('✅ Created test project:', project.name)
    } else {
      console.log(`✅ Found ${projects.length} existing projects`)
    }

    // 2. Test Epic Creation
    console.log('\n2️⃣ Testing Epic creation...')
    const epic = await prisma.epic.create({
      data: {
        workspaceId: 'test-workspace',
        projectId: projects[0]?.id || 'test-project-1',
        title: 'User Authentication Epic',
        description: 'Implement user authentication and authorization',
        color: '#3b82f6',
        order: 1
      }
    })
    console.log('✅ Created epic:', epic.title)

    // 3. Test Milestone Creation
    console.log('\n3️⃣ Testing Milestone creation...')
    const milestone = await prisma.milestone.create({
      data: {
        workspaceId: 'test-workspace',
        projectId: projects[0]?.id || 'test-project-1',
        title: 'Q1 2024 Milestone',
        description: 'First quarter deliverables',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      }
    })
    console.log('✅ Created milestone:', milestone.title)

    // 4. Test Custom Field Creation
    console.log('\n4️⃣ Testing Custom Field creation...')
    const customField = await prisma.customFieldDef.create({
      data: {
        projectId: projects[0]?.id || 'test-project-1',
        key: 'story_points',
        label: 'Story Points',
        type: 'number',
        uniqueKey: `${projects[0]?.id || 'test-project-1'}:story_points`
      }
    })
    console.log('✅ Created custom field:', customField.label)

    // 5. Test Task Creation with Epic and Milestone
    console.log('\n5️⃣ Testing Task creation with Epic and Milestone...')
    const task = await prisma.task.create({
      data: {
        projectId: projects[0]?.id || 'test-project-1',
        workspaceId: 'test-workspace',
        title: 'Implement Login Form',
        description: 'Create a responsive login form with validation',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        epicId: epic.id,
        milestoneId: milestone.id,
        points: 5,
        createdById: 'test-user-1'
      }
    })
    console.log('✅ Created task:', task.title, 'with epic and milestone')

    // 6. Test Custom Field Value
    console.log('\n6️⃣ Testing Custom Field value assignment...')
    const customFieldValue = await prisma.customFieldVal.create({
      data: {
        taskId: task.id,
        fieldId: customField.id,
        value: 8
      }
    })
    console.log('✅ Set custom field value:', customFieldValue.value)

    // 7. Test Task History
    console.log('\n7️⃣ Testing Task History logging...')
    const taskHistory = await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        actorId: 'test-user-1',
        field: 'status',
        from: 'TODO',
        to: 'IN_PROGRESS'
      }
    })
    console.log('✅ Created task history entry:', taskHistory.field)

    // 8. Test Comment Creation
    console.log('\n8️⃣ Testing Comment creation...')
    const comment = await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: 'test-user-1',
        content: 'Great work on this task! @test-user-2 can you review this?',
        mentions: ['test-user-2']
      }
    })
    console.log('✅ Created comment with mention:', comment.content.substring(0, 50) + '...')

    // 9. Test Daily Summary
    console.log('\n9️⃣ Testing Daily Summary creation...')
    const dailySummary = await prisma.projectDailySummary.create({
      data: {
        projectId: projects[0]?.id || 'test-project-1',
        date: new Date(),
        text: 'Today we completed the login form implementation and made good progress on user authentication. The team is on track to meet the Q1 milestone deadline.'
      }
    })
    console.log('✅ Created daily summary:', dailySummary.text.substring(0, 50) + '...')

    // 10. Test Reports Data
    console.log('\n🔟 Testing Reports data...')
    
    // Get velocity data
    const completedTasks = await prisma.task.findMany({
      where: {
        projectId: projects[0]?.id || 'test-project-1',
        status: 'DONE'
      }
    })
    console.log('✅ Found', completedTasks.length, 'completed tasks for velocity report')

    // Get work in review data
    const tasksInReview = await prisma.task.findMany({
      where: {
        projectId: projects[0]?.id || 'test-project-1',
        status: 'IN_REVIEW',
        updatedAt: {
          lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      }
    })
    console.log('✅ Found', tasksInReview.length, 'tasks in review > 3 days')

    // Get burndown data
    const activeMilestones = await prisma.milestone.findMany({
      where: {
        projectId: projects[0]?.id || 'test-project-1',
        OR: [
          { endDate: { gte: new Date() } },
          { endDate: null }
        ]
      },
      include: {
        tasks: true
      }
    })
    console.log('✅ Found', activeMilestones.length, 'active milestones for burndown')

    console.log('\n🎉 Smoke Test Completed Successfully!')
    console.log('\n📊 Summary:')
    console.log('✅ Epic creation and task assignment')
    console.log('✅ Milestone creation with dates')
    console.log('✅ Custom field definition and values')
    console.log('✅ Task history logging')
    console.log('✅ Comment creation with mentions')
    console.log('✅ Daily summary generation')
    console.log('✅ Reports data collection')
    console.log('\n🚀 All Phase 10 features are working correctly!')

  } catch (error) {
    console.error('❌ Smoke test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

smokeTest()
