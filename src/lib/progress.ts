import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function calculatePlanProgress(planId: string): Promise<number> {
  const plan = await prisma.onboardingPlan.findUnique({
    where: { id: planId },
    include: {
      tasks: true,
    },
  })

  if (!plan || plan.tasks.length === 0) {
    return 0
  }

  const completedTasks = plan.tasks.filter(task => task.status === 'DONE').length
  const totalTasks = plan.tasks.length
  
  return Math.floor((completedTasks / totalTasks) * 100)
}

export async function updatePlanProgress(planId: string): Promise<void> {
  const progressPct = await calculatePlanProgress(planId)
  
  const updateData: any = {
    progressPct,
  }

  // If progress is 100%, mark plan as completed and set end date
  if (progressPct === 100) {
    updateData.status = 'COMPLETED'
    updateData.endDate = new Date()
  }

  await prisma.onboardingPlan.update({
    where: { id: planId },
    data: updateData,
  })
}

export async function getPlanAnalytics(workspaceId: string) {
  const plans = await prisma.onboardingPlan.findMany({
    where: { workspaceId },
    include: {
      tasks: true,
      employee: true,
      template: true,
    },
  })

  const activePlans = plans.filter(plan => plan.status === 'ACTIVE')
  const completedPlans = plans.filter(plan => plan.status === 'COMPLETED')
  
  const avgCompletionRate = completedPlans.length > 0 
    ? completedPlans.reduce((sum, plan) => sum + plan.progressPct, 0) / completedPlans.length 
    : 0

  const overdueTasks = plans.flatMap(plan => 
    plan.tasks.filter(task => 
      task.status !== 'DONE' && 
      task.dueDate && 
      task.dueDate < new Date()
    )
  )

  const avgDaysToCompleteFirst10 = completedPlans.length > 0
    ? completedPlans.map(plan => {
        const first10Tasks = plan.tasks
          .filter(task => task.status === 'DONE')
          .sort((a, b) => a.order - b.order)
          .slice(0, 10)
        
        if (first10Tasks.length === 0) return 0
        
        const lastCompletedTask = first10Tasks[first10Tasks.length - 1]
        const daysDiff = lastCompletedTask.completedAt 
          ? Math.ceil((lastCompletedTask.completedAt.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0
        
        return daysDiff
      }).reduce((sum, days) => sum + days, 0) / completedPlans.length
    : 0

  return {
    totalPlans: plans.length,
    activePlans: activePlans.length,
    completedPlans: completedPlans.length,
    avgCompletionRate: Math.round(avgCompletionRate),
    overdueTasks: overdueTasks.length,
    avgDaysToCompleteFirst10: Math.round(avgDaysToCompleteFirst10),
    plans: plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      employeeName: plan.employee.name,
      status: plan.status,
      progressPct: plan.progressPct,
      tasksDone: plan.tasks.filter(task => task.status === 'DONE').length,
      totalTasks: plan.tasks.length,
      daysSinceStart: Math.ceil((new Date().getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  }
}













