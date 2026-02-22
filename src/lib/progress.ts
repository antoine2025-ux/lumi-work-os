import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function calculatePlanProgress(planId: string): Promise<number> {
  const plan = await prisma.onboardingPlan.findUnique({
    where: { id: planId },
    include: {
      onboarding_task_assignments: true,
    },
  })

  if (!plan || plan.onboarding_task_assignments.length === 0) {
    return 0
  }

  const completedTasks = plan.onboarding_task_assignments.filter(task => task.status === 'COMPLETED').length
  const totalTasks = plan.onboarding_task_assignments.length

  return Math.floor((completedTasks / totalTasks) * 100)
}

export async function updatePlanProgress(planId: string): Promise<void> {
  const progressPct = await calculatePlanProgress(planId)

  // Only update status when plan reaches 100% — progressPct is not stored in the schema
  if (progressPct === 100) {
    await prisma.onboardingPlan.update({
      where: { id: planId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
      },
    })
  }
}

export async function getPlanAnalytics(workspaceId: string) {
  const plans = await prisma.onboardingPlan.findMany({
    where: { workspaceId },
    include: {
      onboarding_task_assignments: true,
      users: true,
      template: true,
    },
  })

  const computeProgress = (assignments: { status: string }[]) =>
    assignments.length === 0
      ? 0
      : Math.floor(
          (assignments.filter(t => t.status === 'COMPLETED').length / assignments.length) * 100
        )

  const activePlans = plans.filter(plan => plan.status === 'ACTIVE')
  const completedPlans = plans.filter(plan => plan.status === 'COMPLETED')

  const avgCompletionRate = completedPlans.length > 0
    ? completedPlans.reduce((sum, plan) => sum + computeProgress(plan.onboarding_task_assignments), 0) / completedPlans.length
    : 0

  const overdueTasks = plans.flatMap(plan =>
    plan.onboarding_task_assignments.filter(task =>
      task.status !== 'COMPLETED' &&
      task.completedAt === null &&
      new Date() > (plan.endDate ?? new Date(8640000000000000)) // use plan end date as proxy
    )
  )

  const avgDaysToCompleteFirst10 = completedPlans.length > 0
    ? completedPlans.map(plan => {
        const completedTasks = plan.onboarding_task_assignments
          .filter(task => task.status === 'COMPLETED' && task.completedAt !== null)
          .sort((a, b) => (a.completedAt!.getTime() - b.completedAt!.getTime()))
          .slice(0, 10)

        if (completedTasks.length === 0) return 0

        const lastCompletedTask = completedTasks[completedTasks.length - 1]
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
      name: plan.title,
      employeeName: plan.users.name ?? 'Unknown',
      status: plan.status,
      progressPct: computeProgress(plan.onboarding_task_assignments),
      tasksDone: plan.onboarding_task_assignments.filter(task => task.status === 'COMPLETED').length,
      totalTasks: plan.onboarding_task_assignments.length,
      daysSinceStart: Math.ceil((new Date().getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  }
}
