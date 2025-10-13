import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import OpenAI from 'openai'
import { getWikiContext } from '@/lib/wiki'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const generatePlanSchema = z.object({
  role: z.string().min(1).max(100),
  seniority: z.string().min(1).max(50),
  department: z.string().min(1).max(100),
  durationDays: z.number().int().min(1).max(365),
  employeeId: z.string().min(1),
  startDate: z.string().datetime(),
})

// Fallback task generator when OpenAI API fails
function generateFallbackTasks(role: string, seniority: string, department: string, durationDays: number) {
  const baseTasks = [
    { title: 'Complete HR paperwork', description: 'Fill out all required HR forms and documentation', dueDay: 1 },
    { title: 'Set up workspace access', description: 'Get access to necessary systems and tools', dueDay: 1 },
    { title: 'Meet with manager', description: 'Initial meeting with direct manager', dueDay: 2 },
    { title: 'Team introduction', description: 'Meet with team members and understand roles', dueDay: 3 },
    { title: 'Review company policies', description: 'Study company handbook and policies', dueDay: 5 },
    { title: 'Complete security training', description: 'Mandatory security awareness training', dueDay: 7 },
  ]

  const roleSpecificTasks = {
    'Software Engineer': [
      { title: 'Set up development environment', description: 'Install and configure development tools', dueDay: 10 },
      { title: 'Review codebase architecture', description: 'Study the main codebase structure', dueDay: 14 },
      { title: 'Complete first code review', description: 'Participate in code review process', dueDay: 21 },
      { title: 'Write first feature', description: 'Implement a small feature or bug fix', dueDay: 28 },
    ],
    'Product Manager': [
      { title: 'Review product roadmap', description: 'Study current product strategy and roadmap', dueDay: 10 },
      { title: 'Meet with stakeholders', description: 'Meet with key stakeholders and customers', dueDay: 14 },
      { title: 'Analyze user feedback', description: 'Review recent user feedback and analytics', dueDay: 21 },
      { title: 'Create first product spec', description: 'Write specification for a new feature', dueDay: 28 },
    ],
    'Marketing Manager': [
      { title: 'Review marketing strategy', description: 'Study current marketing campaigns and strategy', dueDay: 10 },
      { title: 'Set up marketing tools', description: 'Configure marketing automation and analytics', dueDay: 14 },
      { title: 'Complete brand guidelines training', description: 'Learn company brand guidelines', dueDay: 21 },
      { title: 'Plan first campaign', description: 'Develop and present first marketing campaign', dueDay: 28 },
    ],
    'Designer': [
      { title: 'Set up design tools', description: 'Install and configure design software', dueDay: 10 },
      { title: 'Review design system', description: 'Study company design system and guidelines', dueDay: 14 },
      { title: 'Complete design review', description: 'Participate in design critique session', dueDay: 21 },
      { title: 'Create first design', description: 'Design a new component or page', dueDay: 28 },
    ],
  }

  const roleTasks = roleSpecificTasks[role as keyof typeof roleSpecificTasks] || roleSpecificTasks['Software Engineer']
  
  // Scale tasks based on duration
  const totalTasks = Math.min(Math.floor(durationDays / 3), 15)
  const allTasks = [...baseTasks, ...roleTasks]
  
  return allTasks.slice(0, totalTasks).map((task, index) => ({
    ...task,
    dueDay: Math.min(task.dueDay, durationDays)
  }))
}


// POST /api/onboarding/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = generatePlanSchema.parse(body)

    // Get wiki context
    const wikiContext = getWikiContext()

    // Create OpenAI prompt
    const systemPrompt = `You are Lumi's AI onboarding designer. Given the role, seniority, department, and duration, along with company context, output a concise onboarding plan as strict JSON:

{
  "planName": "Role - Duration Day Plan",
  "tasks": [
    {"title": "...", "description": "...", "dueDay": 1},
    ...
  ]
}

Rules:
- Generate 12-25 tasks depending on duration
- dueDay between 1 and durationDays; front-load essentials (access, tools, culture)
- Use company terminology if present in the wiki excerpt
- Keep titles short; descriptions 1-3 sentences
- Avoid duplicate tasks; include 1-2 intro meetings and 1 wrap-up review
- Focus on practical, actionable tasks
- Include both technical and cultural aspects`

    const userPrompt = `
Role: ${validatedData.role}
Seniority: ${validatedData.seniority}
Department: ${validatedData.department}
Duration: ${validatedData.durationDays} days

Company Context:
${wikiContext}

Generate a comprehensive onboarding plan for this role.`

    let planData
    let tasks

    try {
      // Use OpenAI API to generate the plan with timeout
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API request timed out')), 25000)
        )
      ]) as any

      const responseText = completion.choices[0]?.message?.content
      if (!responseText) {
        throw new Error('No response from OpenAI')
      }

      // Parse JSON response
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        planData = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid JSON response from AI')
      }

      // Validate the AI response structure
      if (!planData.planName || !Array.isArray(planData.tasks)) {
        throw new Error('Invalid plan structure from AI')
      }

      // Limit tasks to 30 as specified
      tasks = planData.tasks.slice(0, 30)
    } catch (openaiError) {
      console.error('OpenAI API failed, using fallback:', openaiError)
      
      // Fallback: Generate a structured plan based on role and duration
      const roleBasedTasks = generateFallbackTasks(validatedData.role, validatedData.seniority, validatedData.department, validatedData.durationDays)
      
      planData = {
        planName: `${validatedData.role} - ${validatedData.durationDays} Day Plan`,
        tasks: roleBasedTasks
      }
      
      tasks = roleBasedTasks
    }

    // Get the workspace and a valid user ID
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'default' },
    })

    if (!workspace) {
      throw new Error('Default workspace not found')
    }

    // Get a valid user ID (use the workspace owner or first available user)
    const user = await prisma.user.findFirst({
      where: { id: workspace.ownerId },
    })

    if (!user) {
      throw new Error('No valid user found for creating templates')
    }

    // Create template (private visibility)
    const template = await prisma.onboardingTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: planData.planName,
        durationDays: validatedData.durationDays,
        description: `AI-generated onboarding plan for ${validatedData.role} in ${validatedData.department}`,
        visibility: 'PRIVATE',
        createdById: user.id,
        tasks: {
          create: tasks.map((task: any, index: number) => ({
            title: task.title || `Task ${index + 1}`,
            description: task.description || '',
            order: index,
            dueDay: task.dueDay || Math.min(index + 1, validatedData.durationDays),
          })),
        },
      },
    })

    // Create plan for the employee
    const startDate = new Date(validatedData.startDate)
    const plan = await prisma.onboardingPlan.create({
      data: {
        workspaceId: workspace.id,
        employeeId: validatedData.employeeId,
        templateId: template.id,
        name: planData.planName,
        startDate,
        createdById: user.id,
        tasks: {
          create: tasks.map((task: any, index: number) => ({
            title: task.title || `Task ${index + 1}`,
            description: task.description || '',
            order: index,
            status: 'PENDING',
            dueDate: task.dueDay ? new Date(startDate.getTime() + task.dueDay * 24 * 60 * 60 * 1000) : null,
          })),
        },
      },
      include: {
        employee: {
          select: { name: true, email: true },
        },
        template: {
          select: { name: true, durationDays: true },
        },
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({
      plan,
      template,
      success: true,
      message: planData.planName.includes('AI') ? 'AI-generated plan created successfully!' : 'Plan created successfully using fallback system!',
    }, { status: 201 })

  } catch (error) {
    console.error('Error generating plan:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'GENERATION_ERROR', message: 'Failed to generate onboarding plan', details: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    )
  }
}
