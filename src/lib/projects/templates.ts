/**
 * Project starter templates - static data for new project creation.
 * Used by ProjectTemplateSelector and POST /api/projects when templateData is provided.
 */

export type ProjectTemplateCategory =
  | 'engineering'
  | 'product'
  | 'marketing'
  | 'operations'
  | 'general'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface ProjectTemplateTask {
  title: string
  description?: string
  priority?: TaskPriority
}

export interface ProjectTemplateTaskGroup {
  name: string
  tasks: ProjectTemplateTask[]
}

export interface ProjectTemplateData {
  id: string
  name: string
  description: string
  icon: string
  category: ProjectTemplateCategory
  defaultStatuses: string[]
  taskGroups: ProjectTemplateTaskGroup[]
}

export const PROJECT_TEMPLATES: ProjectTemplateData[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with an empty project and add structure as you go',
    icon: 'FileText',
    category: 'general',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'Done'],
    taskGroups: [],
  },
  {
    id: 'software-sprint',
    name: 'Software Sprint',
    description: 'Plan, develop, test, and release in a structured sprint',
    icon: 'Code',
    category: 'engineering',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    taskGroups: [
      {
        name: 'Planning',
        tasks: [
          { title: 'Sprint planning meeting', description: 'Define sprint goals and scope', priority: 'HIGH' },
          { title: 'Backlog grooming', description: 'Refine and prioritize backlog items', priority: 'MEDIUM' },
          { title: 'Capacity planning', description: 'Assign work based on team availability', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Development',
        tasks: [
          { title: 'Implement features', description: 'Build according to acceptance criteria', priority: 'HIGH' },
          { title: 'Code review', description: 'Peer review all changes before merge', priority: 'HIGH' },
          { title: 'Address review feedback', description: 'Fix issues raised in code review', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Testing',
        tasks: [
          { title: 'QA testing', description: 'Verify functionality and edge cases', priority: 'HIGH' },
          { title: 'Bug fixes', description: 'Address issues found during QA', priority: 'HIGH' },
          { title: 'Regression testing', description: 'Ensure no existing functionality is broken', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Release',
        tasks: [
          { title: 'Deploy to staging', description: 'Deploy and smoke test in staging', priority: 'HIGH' },
          { title: 'Production deploy', description: 'Deploy to production', priority: 'URGENT' },
          { title: 'Sprint retrospective', description: 'Review what went well and improvements', priority: 'LOW' },
        ],
      },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Research, design, build, and launch a new product or feature',
    icon: 'Rocket',
    category: 'product',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    taskGroups: [
      {
        name: 'Research',
        tasks: [
          { title: 'Market research', description: 'Understand market needs and competition', priority: 'HIGH' },
          { title: 'User interviews', description: 'Gather feedback from target users', priority: 'HIGH' },
          { title: 'Define success metrics', description: 'Establish KPIs for launch', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Design',
        tasks: [
          { title: 'PRD creation', description: 'Write product requirements document', priority: 'HIGH' },
          { title: 'Design review', description: 'Review and approve designs', priority: 'MEDIUM' },
          { title: 'Prototype validation', description: 'Validate flows with stakeholders', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Build',
        tasks: [
          { title: 'Beta development', description: 'Build MVP for beta testing', priority: 'HIGH' },
          { title: 'Beta testing', description: 'Run closed beta with selected users', priority: 'HIGH' },
          { title: 'Iterate on feedback', description: 'Address beta feedback', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Launch',
        tasks: [
          { title: 'Launch communications', description: 'Prepare launch announcements and docs', priority: 'HIGH' },
          { title: 'Go-live', description: 'Ship to production', priority: 'URGENT' },
          { title: 'Metrics review', description: 'Review post-launch metrics and learnings', priority: 'MEDIUM' },
        ],
      },
    ],
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Strategy, content, distribution, and analysis for a campaign',
    icon: 'Megaphone',
    category: 'marketing',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    taskGroups: [
      {
        name: 'Strategy',
        tasks: [
          { title: 'Campaign brief', description: 'Define goals, audience, and messaging', priority: 'HIGH' },
          { title: 'Channel selection', description: 'Choose distribution channels', priority: 'MEDIUM' },
          { title: 'Timeline and budget', description: 'Plan schedule and allocate budget', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Content',
        tasks: [
          { title: 'Copywriting', description: 'Write headlines, body copy, and CTAs', priority: 'HIGH' },
          { title: 'Design assets', description: 'Create visuals and creative materials', priority: 'HIGH' },
          { title: 'Content review', description: 'Stakeholder approval on all content', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Distribution',
        tasks: [
          { title: 'Social posts', description: 'Schedule and publish social content', priority: 'HIGH' },
          { title: 'Email campaign', description: 'Set up and send email sequences', priority: 'HIGH' },
          { title: 'Paid ads setup', description: 'Configure and launch paid campaigns', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Analysis',
        tasks: [
          { title: 'Analytics setup', description: 'Configure tracking and attribution', priority: 'HIGH' },
          { title: 'Performance monitoring', description: 'Track KPIs during campaign', priority: 'MEDIUM' },
          { title: 'Analytics report', description: 'Compile results and recommendations', priority: 'MEDIUM' },
        ],
      },
    ],
  },
  {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    description: 'Setup, training, and handoff for new client engagements',
    icon: 'Users',
    category: 'operations',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'Done'],
    taskGroups: [
      {
        name: 'Setup',
        tasks: [
          { title: 'Account setup', description: 'Create accounts and configure access', priority: 'HIGH' },
          { title: 'Contract and paperwork', description: 'Complete agreements and SOW', priority: 'HIGH' },
          { title: 'Kickoff call', description: 'Introduce team and align on goals', priority: 'HIGH' },
        ],
      },
      {
        name: 'Training',
        tasks: [
          { title: 'Training sessions', description: 'Conduct product/platform training', priority: 'HIGH' },
          { title: 'Documentation', description: 'Provide guides and reference materials', priority: 'MEDIUM' },
          { title: 'Q&A and support', description: 'Address questions and edge cases', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Handoff',
        tasks: [
          { title: 'Go-live checklist', description: 'Complete pre-launch verification', priority: 'HIGH' },
          { title: 'Handoff to account team', description: 'Transition to ongoing support', priority: 'MEDIUM' },
          { title: '30-day check-in', description: 'Review adoption and satisfaction', priority: 'LOW' },
        ],
      },
    ],
  },
  {
    id: 'bug-bash',
    name: 'Bug Bash',
    description: 'Triage, fix, and verify bugs in a focused effort',
    icon: 'Bug',
    category: 'engineering',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    taskGroups: [
      {
        name: 'Triage',
        tasks: [
          { title: 'Bug categorization', description: 'Group and tag reported bugs', priority: 'HIGH' },
          { title: 'Priority assignment', description: 'Assign severity and priority', priority: 'HIGH' },
          { title: 'Reproduction steps', description: 'Document steps to reproduce', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Fix',
        tasks: [
          { title: 'Fix implementation', description: 'Implement fixes for assigned bugs', priority: 'HIGH' },
          { title: 'Unit tests', description: 'Add or update tests for fixes', priority: 'MEDIUM' },
          { title: 'Code review', description: 'Review fixes before merge', priority: 'HIGH' },
        ],
      },
      {
        name: 'Verify',
        tasks: [
          { title: 'Regression testing', description: 'Verify fixes and no new regressions', priority: 'HIGH' },
          { title: 'Release preparation', description: 'Prepare bug fix release', priority: 'MEDIUM' },
          { title: 'Release and monitor', description: 'Deploy and monitor for issues', priority: 'URGENT' },
        ],
      },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan, write, review, and publish content on a schedule',
    icon: 'Calendar',
    category: 'marketing',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    taskGroups: [
      {
        name: 'Monthly Planning',
        tasks: [
          { title: 'Topic brainstorm', description: 'Generate content ideas for the month', priority: 'HIGH' },
          { title: 'Calendar creation', description: 'Build editorial calendar', priority: 'MEDIUM' },
          { title: 'Assign writers', description: 'Assign topics to team members', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Writing',
        tasks: [
          { title: 'Drafts', description: 'Write first drafts of content', priority: 'HIGH' },
          { title: 'Internal review', description: 'Self-edit and refine', priority: 'MEDIUM' },
          { title: 'Fact-checking', description: 'Verify claims and sources', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Review',
        tasks: [
          { title: 'Editorial review', description: 'Editor reviews and provides feedback', priority: 'HIGH' },
          { title: 'Revisions', description: 'Address editorial feedback', priority: 'MEDIUM' },
          { title: 'Final approval', description: 'Stakeholder sign-off', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Publish',
        tasks: [
          { title: 'Scheduling', description: 'Schedule publication dates', priority: 'MEDIUM' },
          { title: 'Distribution', description: 'Publish and promote content', priority: 'HIGH' },
          { title: 'Performance tracking', description: 'Track engagement metrics', priority: 'LOW' },
        ],
      },
    ],
  },
  {
    id: 'team-offsite',
    name: 'Team Offsite',
    description: 'Plan, execute, and follow up on a team offsite event',
    icon: 'MapPin',
    category: 'operations',
    defaultStatuses: ['Backlog', 'To Do', 'In Progress', 'Done'],
    taskGroups: [
      {
        name: 'Planning',
        tasks: [
          { title: 'Venue selection', description: 'Research and book venue', priority: 'HIGH' },
          { title: 'Date and attendance', description: 'Confirm dates and invite attendees', priority: 'HIGH' },
          { title: 'Budget approval', description: 'Get budget sign-off', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Logistics',
        tasks: [
          { title: 'Travel arrangements', description: 'Coordinate flights and transport', priority: 'HIGH' },
          { title: 'Catering', description: 'Arrange meals and refreshments', priority: 'MEDIUM' },
          { title: 'Accommodation', description: 'Book hotels if needed', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Agenda',
        tasks: [
          { title: 'Session planning', description: 'Design workshops and sessions', priority: 'HIGH' },
          { title: 'Materials preparation', description: 'Prepare slides and handouts', priority: 'MEDIUM' },
          { title: 'Facilitation prep', description: 'Brief facilitators and assign roles', priority: 'MEDIUM' },
        ],
      },
      {
        name: 'Follow-up',
        tasks: [
          { title: 'Action items', description: 'Document and assign action items', priority: 'HIGH' },
          { title: 'Feedback survey', description: 'Send post-offsite survey', priority: 'LOW' },
          { title: 'Retrospective', description: 'Review what worked for next time', priority: 'LOW' },
        ],
      },
    ],
  },
]
