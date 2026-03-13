import type { AgentPlan } from "@/lib/loopbrain/agent/types"
import type { StepProgressState } from "@/components/loopbrain/execution-progress"
import type { ExecutionPlanStep } from "./execution-plan-view"

/**
 * Tool name to human-readable label mapping
 */
const TOOL_LABEL_TEMPLATES: Record<string, (params: Record<string, unknown>) => string> = {
  createProject: (p) => `Create project: ${p.name ?? 'Untitled'}`,
  createTask: (p) => `Add task: ${p.title ?? 'Untitled'}`,
  createEpic: (p) => `Create epic: ${p.title ?? 'Untitled'}`,
  createTodo: (p) => `Add todo: ${p.title ?? 'Untitled'}`,
  createWikiPage: (p) => `Create wiki page: ${p.title ?? 'Untitled'}`,
  createGoal: (p) => `Create goal: ${p.name ?? 'Untitled'}`,
  createCalendarEvent: (p) => `Schedule: ${p.title ?? 'Event'}`,
  createMultipleCalendarEvents: (p) => `Schedule ${Array.isArray(p.events) ? p.events.length : 'multiple'} events`,
  assignTask: (p) => `Assign task`,
  updateTaskStatus: (p) => `Update task status`,
  updateProject: (p) => `Update project`,
  addPersonToProject: (p) => `Add person to project`,
  assignToProject: (p) => `Assign to project`,
  linkProjectToGoal: (p) => `Link project to goal`,
  addSubtask: (p) => `Add subtask`,
  sendEmail: (p) => `Send email: ${p.subject ?? 'Untitled'}`,
  replyToEmail: (p) => `Reply to email`,
  createPerson: (p) => `Create person: ${p.name ?? 'Untitled'}`,
  assignManager: (p) => `Assign manager`,
  createTimeOff: (p) => `Create time off request`,
  listProjects: () => `List projects`,
  listPeople: () => `List people`,
  readWikiPage: (p) => `Read wiki page`,
  searchDriveFiles: (p) => `Search Drive files`,
  readDriveDocument: (p) => `Read Drive document`,
  createDriveDocument: (p) => `Create Drive document`,
  updateDriveDocument: (p) => `Update Drive document`,
}

/**
 * Generate a human-readable label for a tool call
 */
function generateStepLabel(toolName: string, parameters: Record<string, unknown>): string {
  const template = TOOL_LABEL_TEMPLATES[toolName]
  if (template) {
    return template(parameters)
  }
  // Fallback: capitalize and format tool name
  return toolName.replace(/([A-Z])/g, ' $1').trim()
}

/**
 * Map step status from StepProgressState to ExecutionPlanStep status
 */
function mapStepStatus(
  stepIndex: number,
  stepProgress?: StepProgressState[]
): ExecutionPlanStep['status'] {
  if (!stepProgress || !stepProgress[stepIndex]) {
    return 'pending'
  }
  const progressStatus = stepProgress[stepIndex].status
  // Map progress status to plan status
  if (progressStatus === 'executing') return 'executing'
  if (progressStatus === 'success') return 'success'
  if (progressStatus === 'error') return 'error'
  return 'pending'
}

/**
 * Transform raw AgentPlan data into structured display format for ExecutionPlanView
 * 
 * Grouping logic:
 * 1. Use step.dependsOn to determine parent-child relationships
 * 2. Fallback: If a createProject step is followed by createTask steps with no explicit
 *    dependencies, group them as children
 * 3. All other tools are rendered as separate top-level items
 */
export function formatPlanForDisplay(
  plan: AgentPlan,
  stepProgress?: StepProgressState[]
): {
  title: string
  description?: string
  steps: ExecutionPlanStep[]
} {
  const steps = plan.steps ?? []
  
  // Extract project title from first createProject step
  const projectStep = steps.find(s => s.toolName === 'createProject')
  const projectTitle = projectStep?.parameters?.name as string | undefined
  const title = projectTitle ?? 'Execution Plan'

  // Find the project step index for dependency checking
  const projectStepNumber = projectStep?.stepNumber

  // Build the display steps with hierarchy
  const displaySteps: ExecutionPlanStep[] = []
  const processedIndices = new Set<number>()

  steps.forEach((step, index) => {
    if (processedIndices.has(index)) return

    const stepId = `step-${step.stepNumber}`
    const label = generateStepLabel(step.toolName, step.parameters)
    const status = mapStepStatus(index, stepProgress)

    // If this is a createProject step, gather its children
    if (step.toolName === 'createProject') {
      const children: ExecutionPlanStep['children'] = []

      // Find all createTask steps that depend on this project
      steps.forEach((childStep, childIndex) => {
        if (childIndex === index) return
        if (processedIndices.has(childIndex)) return
        
        const isChild = 
          childStep.toolName === 'createTask' && (
            // Explicit dependency
            childStep.dependsOn?.includes(step.stepNumber) ||
            // Fallback heuristic: createTask steps immediately after createProject with no dependencies
            (childIndex > index && 
             childIndex < index + 10 && // reasonable proximity
             (!childStep.dependsOn || childStep.dependsOn.length === 0))
          )

        if (isChild) {
          children.push({
            id: `step-${childStep.stepNumber}`,
            label: generateStepLabel(childStep.toolName, childStep.parameters),
            status: mapStepStatus(childIndex, stepProgress),
          })
          processedIndices.add(childIndex)
        }
      })

      displaySteps.push({
        id: stepId,
        toolName: step.toolName,
        label,
        status,
        children: children.length > 0 ? children : undefined,
      })
      processedIndices.add(index)
    } 
    // All other steps are top-level items
    else {
      displaySteps.push({
        id: stepId,
        toolName: step.toolName,
        label,
        status,
      })
      processedIndices.add(index)
    }
  })

  return {
    title,
    description: plan.reasoning ? undefined : undefined, // reasoning is internal, not shown
    steps: displaySteps,
  }
}
