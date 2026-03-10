/**
 * Wiki page starter templates
 * All templates use ProseMirror JSON (TipTap's native format) for content.
 */

import { JSONContent } from '@tiptap/core'
import { EMPTY_TIPTAP_DOC } from './constants'

export type WikiTemplateCategory =
  | 'meetings'
  | 'engineering'
  | 'product'
  | 'operations'
  | 'general'
  | 'custom'

export interface WikiTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: WikiTemplateCategory
  content: JSONContent
}

// Helper to build paragraph with text
function p(text: string): JSONContent {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

// Helper to build heading
function h(level: 1 | 2 | 3, text: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

// Helper to build list item
function li(text: string): JSONContent {
  return {
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

// Helper to build task item
function task(text: string, checked = false): JSONContent {
  return {
    type: 'taskItem',
    attrs: { checked },
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

// Helper to build table header cell
function th(text: string): JSONContent {
  return {
    type: 'tableHeader',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

// Helper to build table cell
function td(text: string): JSONContent {
  return {
    type: 'tableCell',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

const BLANK_TEMPLATE: WikiTemplate = {
  id: 'blank',
  name: 'Blank Page',
  description: 'Start with an empty page',
  icon: 'FileText',
  category: 'general',
  content: EMPTY_TIPTAP_DOC,
}

const MEETING_NOTES: WikiTemplate = {
  id: 'meeting-notes',
  name: 'Meeting Notes',
  description: 'Date, attendees, agenda, discussion notes, and action items',
  icon: 'Calendar',
  category: 'meetings',
  content: {
    type: 'doc',
    content: [
      h(1, 'Meeting Notes'),
      p('Date: [Date]'),
      p('Attendees: [Names]'),
      h(2, 'Agenda'),
      {
        type: 'bulletList',
        content: [li('[Agenda item 1]'), li('[Agenda item 2]'), li('[Agenda item 3]')],
      },
      h(2, 'Discussion Notes'),
      p('[Key points and decisions from the meeting]'),
      h(2, 'Action Items'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [th('Action'), th('Owner'), th('Due Date')],
          },
          {
            type: 'tableRow',
            content: [td('[Action item]'), td('[Owner]'), td('[Date]')],
          },
          {
            type: 'tableRow',
            content: [td('[Action item]'), td('[Owner]'), td('[Date]')],
          },
        ],
      },
    ],
  },
}

const SPRINT_RETROSPECTIVE: WikiTemplate = {
  id: 'sprint-retrospective',
  name: 'Sprint Retrospective',
  description: 'What went well, what didn\'t, action items, and team shoutouts',
  icon: 'Users',
  category: 'meetings',
  content: {
    type: 'doc',
    content: [
      h(1, 'Sprint Retrospective'),
      p('Sprint: [Sprint name/number]'),
      p('Date: [Date]'),
      h(2, 'What Went Well'),
      {
        type: 'bulletList',
        content: [
          li('[Success 1]'),
          li('[Success 2]'),
          li('[Success 3]'),
        ],
      },
      h(2, 'What Didn\'t Go Well'),
      {
        type: 'bulletList',
        content: [
          li('[Challenge 1]'),
          li('[Challenge 2]'),
          li('[Challenge 3]'),
        ],
      },
      h(2, 'Action Items'),
      {
        type: 'taskList',
        content: [
          task('[Action item 1]'),
          task('[Action item 2]'),
          task('[Action item 3]'),
        ],
      },
      h(2, 'Team Shoutouts'),
      p('[Recognition for team members who went above and beyond]'),
    ],
  },
}

const ONE_ON_ONE: WikiTemplate = {
  id: 'one-on-one',
  name: '1:1 Meeting',
  description: 'Check-in, discussion topics, action items, and notes for next time',
  icon: 'User',
  category: 'meetings',
  content: {
    type: 'doc',
    content: [
      h(1, '1:1 Meeting'),
      p('Date: [Date]'),
      p('Attendees: [Manager] and [Report]'),
      h(2, 'Check-in'),
      p('[How are things going? Wins, challenges, energy level]'),
      h(2, 'Discussion Topics'),
      {
        type: 'bulletList',
        content: [
          li('[Topic 1]'),
          li('[Topic 2]'),
          li('[Topic 3]'),
        ],
      },
      h(2, 'Action Items'),
      {
        type: 'taskList',
        content: [
          task('[Action for manager]'),
          task('[Action for report]'),
        ],
      },
      h(2, 'Notes for Next Time'),
      p('[Follow-up items or topics to revisit]'),
    ],
  },
}

const RFC_TECHNICAL_DESIGN: WikiTemplate = {
  id: 'rfc-technical-design',
  name: 'RFC / Technical Design',
  description: 'Problem statement, proposed solution, alternatives, risks, and timeline',
  icon: 'FileCode',
  category: 'engineering',
  content: {
    type: 'doc',
    content: [
      h(1, 'RFC: [Title]'),
      p('Author: [Your Name]'),
      p('Date: [Date]'),
      h(2, 'Problem Statement'),
      p('[Describe the problem this RFC aims to solve. Include context and impact.]'),
      h(2, 'Proposed Solution'),
      p('[Detailed description of the proposed approach. Include architecture, data flows, and key design decisions.]'),
      h(2, 'Alternatives Considered'),
      {
        type: 'bulletList',
        content: [
          li('[Alternative 1]: [Brief pros/cons]'),
          li('[Alternative 2]: [Brief pros/cons]'),
          li('[Alternative 3]: [Brief pros/cons]'),
        ],
      },
      h(2, 'Risks and Mitigations'),
      {
        type: 'bulletList',
        content: [
          li('[Risk 1]: [Mitigation strategy]'),
          li('[Risk 2]: [Mitigation strategy]'),
        ],
      },
      h(2, 'Timeline'),
      p('[Key milestones and estimated completion date]'),
    ],
  },
}

const BUG_REPORT: WikiTemplate = {
  id: 'bug-report',
  name: 'Bug Report',
  description: 'Summary, steps to reproduce, expected vs actual behavior, environment, severity',
  icon: 'Bug',
  category: 'engineering',
  content: {
    type: 'doc',
    content: [
      h(1, 'Bug Report'),
      p('[Brief one-line summary of the bug]'),
      h(2, 'Steps to Reproduce'),
      {
        type: 'orderedList',
        content: [
          li('[Step 1]'),
          li('[Step 2]'),
          li('[Step 3]'),
        ],
      },
      h(2, 'Expected Behavior'),
      p('[What should happen]'),
      h(2, 'Actual Behavior'),
      p('[What actually happens]'),
      h(2, 'Environment'),
      p('Browser/OS: [e.g. Chrome 120, macOS 14]'),
      p('App version: [Version]'),
      h(2, 'Severity'),
      p('[Critical / High / Medium / Low]'),
      h(2, 'Additional Context'),
      p('[Screenshots, logs, or other relevant information]'),
    ],
  },
}

const RUNBOOK: WikiTemplate = {
  id: 'runbook',
  name: 'Runbook / Playbook',
  description: 'Trigger conditions, step-by-step resolution, escalation path, post-mortem checklist',
  icon: 'BookOpen',
  category: 'engineering',
  content: {
    type: 'doc',
    content: [
      h(1, 'Runbook: [Incident Type]'),
      h(2, 'Trigger Conditions'),
      p('[When to use this runbook. Symptoms, alerts, or error indicators.]'),
      h(2, 'Step-by-Step Resolution'),
      {
        type: 'orderedList',
        content: [
          li('[Step 1]'),
          li('[Step 2]'),
          li('[Step 3]'),
        ],
      },
      h(2, 'Escalation Path'),
      p('Primary: [Name/Team]'),
      p('Secondary: [Name/Team]'),
      p('On-call: [Contact method]'),
      h(2, 'Post-Mortem Checklist'),
      {
        type: 'taskList',
        content: [
          task('Document root cause'),
          task('Create post-mortem doc'),
          task('Add monitoring/alerting if needed'),
          task('Update runbook with lessons learned'),
        ],
      },
    ],
  },
}

const PRD: WikiTemplate = {
  id: 'prd',
  name: 'PRD (Product Requirements)',
  description: 'Problem, user stories, requirements (must/should/could), success metrics, timeline',
  icon: 'Target',
  category: 'product',
  content: {
    type: 'doc',
    content: [
      h(1, 'Product Requirements: [Feature Name]'),
      p('Owner: [Name]'),
      p('Date: [Date]'),
      h(2, 'Problem'),
      p('[Describe the problem we are solving and for whom.]'),
      h(2, 'User Stories'),
      {
        type: 'bulletList',
        content: [
          li('As [user type], I want [goal] so that [benefit]'),
          li('As [user type], I want [goal] so that [benefit]'),
          li('As [user type], I want [goal] so that [benefit]'),
        ],
      },
      h(2, 'Requirements'),
      p('Must have:'),
      { type: 'bulletList', content: [li('[Requirement 1]'), li('[Requirement 2]')] },
      p('Should have:'),
      { type: 'bulletList', content: [li('[Requirement 1]'), li('[Requirement 2]')] },
      p('Could have:'),
      { type: 'bulletList', content: [li('[Requirement 1]')] },
      h(2, 'Success Metrics'),
      p('[How we will measure success. KPIs, targets, and timeframes.]'),
      h(2, 'Timeline'),
      p('[Key milestones and target launch date]'),
    ],
  },
}

const FEATURE_BRIEF: WikiTemplate = {
  id: 'feature-brief',
  name: 'Feature Brief',
  description: 'One-pager: problem, solution, target users, key metrics, launch plan',
  icon: 'FileCheck',
  category: 'product',
  content: {
    type: 'doc',
    content: [
      h(1, 'Feature Brief: [Feature Name]'),
      h(2, 'Problem'),
      p('[One paragraph: what problem does this solve?]'),
      h(2, 'Solution'),
      p('[One paragraph: what are we building?]'),
      h(2, 'Target Users'),
      p('[Who is this for? Primary user segment.]'),
      h(2, 'Key Metrics'),
      p('[Primary success metric and secondary metrics]'),
      h(2, 'Launch Plan'),
      p('[Phased rollout? Beta? Key dates.]'),
    ],
  },
}

const RELEASE_NOTES: WikiTemplate = {
  id: 'release-notes',
  name: 'Release Notes',
  description: 'Version, date, new features, improvements, bug fixes, known issues',
  icon: 'Package',
  category: 'product',
  content: {
    type: 'doc',
    content: [
      h(1, 'Release Notes'),
      p('Version: [Version]'),
      p('Date: [Date]'),
      h(2, 'New Features'),
      {
        type: 'bulletList',
        content: [
          li('[Feature 1]: [Description]'),
          li('[Feature 2]: [Description]'),
        ],
      },
      h(2, 'Improvements'),
      {
        type: 'bulletList',
        content: [
          li('[Improvement 1]'),
          li('[Improvement 2]'),
        ],
      },
      h(2, 'Bug Fixes'),
      {
        type: 'bulletList',
        content: [
          li('[Fix 1]'),
          li('[Fix 2]'),
        ],
      },
      h(2, 'Known Issues'),
      {
        type: 'bulletList',
        content: [li('[Issue 1]')],
      },
    ],
  },
}

const SOP: WikiTemplate = {
  id: 'sop',
  name: 'SOP (Standard Operating Procedure)',
  description: 'Purpose, scope, responsibilities, step-by-step procedure, exceptions',
  icon: 'ClipboardList',
  category: 'operations',
  content: {
    type: 'doc',
    content: [
      h(1, 'SOP: [Procedure Name]'),
      h(2, 'Purpose'),
      p('[Why this procedure exists and what it achieves.]'),
      h(2, 'Scope'),
      p('[When and where this procedure applies.]'),
      h(2, 'Responsibilities'),
      p('[Who is responsible for each part of the procedure.]'),
      h(2, 'Procedure'),
      {
        type: 'orderedList',
        content: [
          li('[Step 1]'),
          li('[Step 2]'),
          li('[Step 3]'),
          li('[Step 4]'),
        ],
      },
      h(2, 'Exceptions'),
      p('[What to do when standard procedure does not apply.]'),
    ],
  },
}

const ONBOARDING_CHECKLIST: WikiTemplate = {
  id: 'onboarding-checklist',
  name: 'Onboarding Checklist',
  description: 'Day 1/Week 1/Month 1 sections with checkbox items for tools, access, meetings, reading',
  icon: 'UserPlus',
  category: 'operations',
  content: {
    type: 'doc',
    content: [
      h(1, 'Onboarding Checklist'),
      p('New hire: [Name]'),
      p('Start date: [Date]'),
      h(2, 'Day 1'),
      {
        type: 'taskList',
        content: [
          task('Laptop and equipment setup'),
          task('Email and Slack access'),
          task('HR paperwork completed'),
          task('Meet team members'),
          task('Intro to codebase/tools'),
        ],
      },
      h(2, 'Week 1'),
      {
        type: 'taskList',
        content: [
          task('All required tools and access granted'),
          task('Key meetings scheduled'),
          task('Reading list completed'),
          task('First task assigned'),
        ],
      },
      h(2, 'Month 1'),
      {
        type: 'taskList',
        content: [
          task('30-day check-in meeting'),
          task('First project contribution'),
          task('Mentor/buddy assigned'),
        ],
      },
    ],
  },
}

const BLANK_WITH_STRUCTURE: WikiTemplate = {
  id: 'blank-with-structure',
  name: 'Blank with Structure',
  description: 'Minimal scaffold: title, overview, details, next steps',
  icon: 'Layout',
  category: 'general',
  content: {
    type: 'doc',
    content: [
      h(1, '[Title]'),
      h(2, 'Overview'),
      p('[Brief summary of what this document covers.]'),
      h(2, 'Details'),
      p('[Main content and key information.]'),
      h(2, 'Next Steps'),
      p('[Action items or follow-up tasks.]'),
    ],
  },
}

export const WIKI_TEMPLATES: WikiTemplate[] = [
  BLANK_TEMPLATE,
  MEETING_NOTES,
  SPRINT_RETROSPECTIVE,
  ONE_ON_ONE,
  RFC_TECHNICAL_DESIGN,
  BUG_REPORT,
  RUNBOOK,
  PRD,
  FEATURE_BRIEF,
  RELEASE_NOTES,
  SOP,
  ONBOARDING_CHECKLIST,
  BLANK_WITH_STRUCTURE,
]

export function getTemplatesByCategory(
  category: WikiTemplateCategory | 'all'
): WikiTemplate[] {
  if (category === 'all') return WIKI_TEMPLATES
  return WIKI_TEMPLATES.filter((t) => t.category === category)
}

export function getTemplateById(id: string): WikiTemplate | undefined {
  return WIKI_TEMPLATES.find((t) => t.id === id)
}
