import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'


// POST /api/test-projects - Create sample project with tasks for testing
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: projectId' 
      }, { status: 400 })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found' 
      }, { status: 404 })
    }

    // Create sample tasks with different statuses and due dates
    const sampleTasks = [
      {
        title: "Project Planning",
        description: "Define project scope and requirements",
        status: "DONE",
        priority: "HIGH",
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        tags: ["planning", "setup"]
      },
      {
        title: "Database Design",
        description: "Design database schema and relationships",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        tags: ["database", "design"]
      },
      {
        title: "API Development",
        description: "Build REST API endpoints",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        tags: ["api", "backend"]
      },
      {
        title: "Frontend Implementation",
        description: "Create user interface components",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        tags: ["frontend", "ui"]
      },
      {
        title: "Testing & QA",
        description: "Comprehensive testing and quality assurance",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        tags: ["testing", "qa"]
      },
      {
        title: "Documentation",
        description: "Write user and technical documentation",
        status: "TODO",
        priority: "LOW",
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        tags: ["documentation"]
      },
      {
        title: "Deployment",
        description: "Deploy application to production",
        status: "BLOCKED",
        priority: "URGENT",
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        tags: ["deployment", "production"]
      }
    ]

    // Create tasks
    const createdTasks = []
    for (const taskData of sampleTasks) {
      const task = await prisma.task.create({
        data: {
          projectId,
          workspaceId: project.workspaceId,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status as any,
          priority: taskData.priority as any,
          dueDate: taskData.dueDate,
          tags: taskData.tags,
          createdById: 'dev-user-1'
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      createdTasks.push(task)
    }

    return NextResponse.json({
      message: 'Sample tasks created successfully',
      tasks: createdTasks
    })
  } catch (error) {
    console.error('Error creating sample tasks:', error)
    return NextResponse.json({ 
      error: 'Failed to create sample tasks',
      details: error.message 
    }, { status: 500 })
  }
}
