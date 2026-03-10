import { describe, it, expect } from 'vitest'
import { validatePolicy } from '../validator'
import type { AgentPlan } from '../../agent/types'

describe('validatePolicy', () => {
  const validPlan: AgentPlan = {
    reasoning: 'Test plan',
    steps: [
      {
        stepNumber: 1,
        toolName: 'createTask',
        parameters: { title: 'Test', projectId: 'p1' },
        description: 'Create a task',
      },
    ],
    requiresConfirmation: false,
  }

  it('passes for a valid policy', () => {
    const result = validatePolicy({
      content: 'Create a task every day',
      compiledPlan: validPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when content is empty', () => {
    const result = validatePolicy({
      content: '',
      compiledPlan: validPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Policy content is empty')
  })

  it('fails when content exceeds limit', () => {
    const result = validatePolicy({
      content: 'x'.repeat(10_001),
      compiledPlan: validPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('10,000'))).toBe(true)
  })

  it('fails when compiled plan is null', () => {
    const result = validatePolicy({
      content: 'Do something',
      compiledPlan: null,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('compiled'))).toBe(true)
  })

  it('fails when plan has no steps', () => {
    const emptyPlan: AgentPlan = {
      reasoning: 'Empty',
      steps: [],
      requiresConfirmation: false,
    }
    const result = validatePolicy({
      content: 'Do something',
      compiledPlan: emptyPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('no steps'))).toBe(true)
  })

  it('fails when step count exceeds maxActions', () => {
    const bigPlan: AgentPlan = {
      reasoning: 'Big plan',
      steps: Array.from({ length: 10 }, (_, i) => ({
        stepNumber: i + 1,
        toolName: 'createTask',
        parameters: {},
        description: `Step ${i + 1}`,
      })),
      requiresConfirmation: false,
    }
    const result = validatePolicy({
      content: 'Do many things',
      compiledPlan: bigPlan,
      userRole: 'MEMBER',
      maxActions: 5,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('exceeding'))).toBe(true)
  })

  it('fails when a tool name is unknown', () => {
    const badPlan: AgentPlan = {
      reasoning: 'Bad tool',
      steps: [
        {
          stepNumber: 1,
          toolName: 'nonExistentTool',
          parameters: {},
          description: 'Bad step',
        },
      ],
      requiresConfirmation: false,
    }
    const result = validatePolicy({
      content: 'Do something',
      compiledPlan: badPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Unknown tool'))).toBe(true)
  })

  it('warns about forward dependencies', () => {
    const forwardDepPlan: AgentPlan = {
      reasoning: 'Forward dep',
      steps: [
        {
          stepNumber: 1,
          toolName: 'createTask',
          parameters: {},
          dependsOn: [2],
          description: 'Step 1 depends on step 2',
        },
        {
          stepNumber: 2,
          toolName: 'createTask',
          parameters: {},
          description: 'Step 2',
        },
      ],
      requiresConfirmation: false,
    }
    const result = validatePolicy({
      content: 'Do something',
      compiledPlan: forwardDepPlan,
      userRole: 'MEMBER',
      maxActions: 50,
    })
    expect(result.warnings.some((w) => w.includes("hasn't executed"))).toBe(true)
  })
})
