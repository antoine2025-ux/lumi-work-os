export interface LoopbrainToolDef {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema object
  category: 'read' | 'write'
  requiredRole: 'VIEWER' | 'MEMBER' | 'ADMIN'
}

// READ TOOLS — execute immediately, no confirmation needed

export const READ_TOOLS: LoopbrainToolDef[] = [
  {
    name: 'searchEmail',
    description:
      "Search the user's Gmail inbox. Returns matching email threads with subject, sender, date, and snippet. Use when the user asks about emails, messages, or communication.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g., "from:john subject:Q3 report")',
        },
        maxResults: { type: 'number', description: 'Max results to return (default 10)' },
      },
      required: ['query'],
    },
    category: 'read',
    requiredRole: 'MEMBER',
  },
  {
    name: 'getCalendarEvents',
    description:
      'Get calendar events for a date range. Returns event title, time, attendees, and location. Use when the user asks about schedule, meetings, availability, or calendar.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date (ISO 8601, e.g., "2026-03-03T00:00:00Z")',
        },
        endDate: { type: 'string', description: 'End date (ISO 8601)' },
      },
      required: ['startDate', 'endDate'],
    },
    category: 'read',
    requiredRole: 'MEMBER',
  },
  {
    name: 'searchWiki',
    description:
      'Semantic search across workspace wiki pages. Returns matching pages with title, content snippet, and author. Use when the user asks about documentation, notes, or knowledge base content.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'readWikiPage',
    description:
      'Read the full content of a wiki page by ID or slug. Returns title, plaintext content, tags, author, and last-updated date. Use after searchWiki when you need the actual page content (e.g., "what does the handbook say about PTO?").',
    parameters: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'Wiki page ID (from searchWiki results) — use this OR slug',
        },
        slug: {
          type: 'string',
          description: 'Wiki page slug (e.g., "company-handbook") — use this OR pageId',
        },
      },
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'queryOrg',
    description:
      'Query organizational data — people, teams, departments, reporting chains, roles. Use when the user asks about who works on what, team structure, or organizational questions.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Natural language question about the organization',
        },
        entityType: {
          type: 'string',
          enum: ['person', 'team', 'department', 'role', 'general'],
          description: 'Type of org entity to query',
        },
      },
      required: ['question'],
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'getCapacity',
    description:
      'Get capacity and workload data for a person or team. Returns current allocation, availability, and utilization. Use when the user asks about availability, workload, or who has capacity.',
    parameters: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Person ID (optional — omit for workspace-wide)',
        },
        teamId: { type: 'string', description: 'Team ID (optional)' },
      },
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'getProjectHealth',
    description:
      "Get health status and insights for a project. Returns blockers, risks, velocity, and commendations. Use when the user asks about project status or what's blocking progress.",
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'listProjects',
    description:
      'List all projects in the workspace with basic info (name, status, owner). Use to find a project before taking action on it.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL'],
          description: 'Filter by status (default ALL)',
        },
      },
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'listPeople',
    description:
      'List people in the workspace. Returns name, role, team, department. Use to find a person before assigning tasks or checking capacity.',
    parameters: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'Filter by team (optional)' },
        departmentId: { type: 'string', description: 'Filter by department (optional)' },
      },
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'getPersonProfile',
    description:
      'Get detailed profile for a specific person — their projects, tasks, skills, reporting chain, and availability.',
    parameters: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'Person ID' },
      },
      required: ['personId'],
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
  {
    name: 'searchSlackMessages',
    description:
      'Search Slack messages for context. Returns matching messages with channel, author, and timestamp.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        channelId: {
          type: 'string',
          description: 'Limit to specific channel (optional)',
        },
      },
      required: ['query'],
    },
    category: 'read',
    requiredRole: 'MEMBER',
  },
  {
    name: 'searchDriveFiles',
    description:
      'Search Google Drive for files by name or content. Use when the user asks to search Drive, find meeting notes, docs, or files in Google Drive. Returns file IDs, names, links, types, and modification dates.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "meeting notes gemini" or "budget Q4")',
        },
        mimeType: { type: 'string', description: 'Filter by MIME type (optional)' },
        folderId: { type: 'string', description: 'Search within folder (optional)' },
        maxResults: { type: 'number', description: 'Max results 1-50 (default 10)' },
      },
      required: ['query'],
    },
    category: 'read',
    requiredRole: 'MEMBER',
  },
  {
    name: 'readDriveDocument',
    description:
      'Read the text content of a Google Drive file (Docs, Sheets, meeting notes). Use after searchDriveFiles when you have a file ID.',
    parameters: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'Google Drive file ID from searchDriveFiles',
        },
        format: {
          type: 'string',
          enum: ['text', 'markdown'],
          description: 'Output format (default text)',
        },
      },
      required: ['fileId'],
    },
    category: 'read',
    requiredRole: 'MEMBER',
  },
  {
    name: 'listTasksByAssignee',
    description:
      'List tasks assigned to a specific person, optionally filtered by project and status. Returns task IDs, titles, statuses, priorities, due dates, and project info.',
    parameters: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'The person/user ID whose tasks to list' },
        projectId: { type: 'string', description: 'Optional project ID to scope the query' },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
          description: 'Optional status filter',
        },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
      required: ['personId'],
    },
    category: 'read',
    requiredRole: 'VIEWER',
  },
]

// WRITE TOOLS — confirmation gate intercepts these

export const WRITE_TOOLS: LoopbrainToolDef[] = [
  {
    name: 'createProject',
    description:
      'Create a new project in the workspace. Requires a name. Optional: description, status, priority.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description (optional)' },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
          description: 'Project status (default ACTIVE)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Project priority (default MEDIUM)',
        },
      },
      required: ['name'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createTask',
    description:
      'Create a new task in a project. Requires project ID, title. Optional: description, assignee, priority, due date.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project to create task in' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description (optional)' },
        assigneeId: { type: 'string', description: 'Person ID to assign to (optional)' },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Priority level',
        },
        dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
      },
      required: ['projectId', 'title'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createEpic',
    description:
      'Create an epic (a group of related tasks) within a project. Epics organize multiple related tasks under a common theme or goal.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Epic title' },
        projectId: { type: 'string', description: 'Project ID to create epic in' },
        description: { type: 'string', description: 'Epic description (optional)' },
      },
      required: ['title', 'projectId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'assignTask',
    description: 'Assign an existing task to a person.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        assigneeId: { type: 'string', description: 'Person ID to assign to' },
      },
      required: ['taskId', 'assigneeId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createTodo',
    description: 'Create a personal to-do item for the current user.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'To-do title' },
        note: { type: 'string', description: 'Additional note (optional)' },
        dueAt: { type: 'string', description: 'Due date (ISO 8601 datetime, optional)' },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          description: 'Priority (optional)',
        },
      },
      required: ['title'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createCalendarEvent',
    description:
      'Create a Google Calendar event. Specify title, start/end time, and optional attendees.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'Start time (ISO 8601)' },
        endTime: { type: 'string', description: 'End time (ISO 8601)' },
        description: { type: 'string', description: 'Event description (optional)' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of attendees (optional)',
        },
        location: { type: 'string', description: 'Location (optional)' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createMultipleCalendarEvents',
    description:
      'Create multiple Google Calendar events in one step (e.g. work blocks + breaks). Use for batch scheduling like "plan my work blocks for tomorrow". Max 20 events.',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Event title' },
              startTime: { type: 'string', description: 'Start time (ISO 8601)' },
              endTime: { type: 'string', description: 'End time (ISO 8601)' },
              description: { type: 'string', description: 'Event description (optional)' },
              attendees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Email addresses of attendees (optional)',
              },
              location: { type: 'string', description: 'Location (optional)' },
            },
            required: ['title', 'startTime', 'endTime'],
          },
          description: 'Array of 1-20 calendar events',
        },
      },
      required: ['events'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'sendEmail',
    description: 'Send an email via Gmail.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (plain text)' },
        threadId: { type: 'string', description: 'Thread ID for replies (optional)' },
      },
      required: ['to', 'subject', 'body'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'replyToEmail',
    description:
      'Reply to an existing email thread. Requires threadId and messageId from recent emails context.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Reply body (plain text)' },
        replyToThreadId: { type: 'string', description: 'Thread ID of the email to reply to' },
        replyToMessageId: { type: 'string', description: 'Message ID of the email to reply to' },
      },
      required: ['to', 'subject', 'body', 'replyToThreadId', 'replyToMessageId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createWikiPage',
    description: 'Create a new wiki page in a workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content (markdown)' },
        spaceId: { type: 'string', description: 'Wiki space ID (optional — uses default)' },
      },
      required: ['title', 'content'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'draftWikiPage',
    description:
      'Create a new wiki page and draft its content using AI. The page is created immediately and the user is redirected to it. Content streams into the editor in real-time via the collaboration server. Use this when the user asks you to write, draft, or create a page about a topic — it produces a much richer result than createWikiPage because the AI generates full structured content.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        topic: {
          type: 'string',
          description:
            'What the page should be about — this becomes the AI drafting prompt. Be specific and include context from the conversation.',
        },
        outline: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of section headings to include in the draft',
        },
        spaceId: {
          type: 'string',
          description:
            'Optional. Pass "personal" for user\'s personal space; pass a Space ID for a specific space; omit for company wiki.',
        },
      },
      required: ['title', 'topic'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createGoal',
    description: 'Create a new goal/OKR for the workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title' },
        description: { type: 'string', description: 'Goal description (optional)' },
        ownerId: { type: 'string', description: 'Person ID of goal owner (optional)' },
        level: {
          type: 'string',
          enum: ['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'],
          description: 'Goal level (default TEAM)',
        },
        period: {
          type: 'string',
          enum: ['QUARTERLY', 'ANNUAL', 'CUSTOM'],
          description: 'Goal period (default QUARTERLY)',
        },
      },
      required: ['title'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createTimeOff',
    description: 'Create a time-off / leave request for the current user.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO 8601)' },
        endDate: { type: 'string', description: 'End date (ISO 8601)' },
        reason: { type: 'string', description: 'Reason for leave (optional)' },
        type: {
          type: 'string',
          enum: ['VACATION', 'SICK', 'PERSONAL', 'OTHER'],
          description: 'Leave type',
        },
      },
      required: ['startDate', 'endDate', 'type'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'addPersonToProject',
    description: 'Add a user as a member of a project.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        userId: { type: 'string', description: 'User ID to add' },
        role: {
          type: 'string',
          enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
          description: 'Project role (default MEMBER)',
        },
      },
      required: ['projectId', 'userId'],
    },
    category: 'write',
    requiredRole: 'ADMIN',
  },
  {
    name: 'assignToProject',
    description: 'Add a person to a project as a member.',
    parameters: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'Person ID' },
        projectId: { type: 'string', description: 'Project ID' },
        role: { type: 'string', description: 'Project role (optional)' },
      },
      required: ['personId', 'projectId'],
    },
    category: 'write',
    requiredRole: 'ADMIN',
  },
  {
    name: 'assignManager',
    description: 'Assign a manager to a person.',
    parameters: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'Person to assign manager to' },
        managerId: { type: 'string', description: 'Manager person ID' },
      },
      required: ['personId', 'managerId'],
    },
    category: 'write',
    requiredRole: 'ADMIN',
  },
  {
    name: 'updateTaskStatus',
    description: 'Change the status of an existing task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
          description: 'New status',
        },
      },
      required: ['taskId', 'status'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'updateProject',
    description:
      "Update an existing project's name, description, status, or priority.",
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'New project name (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
          description: 'New status (optional)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'New priority (optional)',
        },
      },
      required: ['projectId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'linkProjectToGoal',
    description:
      'Link a project to a goal, establishing that the project contributes to achieving the goal.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        goalId: { type: 'string', description: 'Goal ID' },
        contributionType: {
          type: 'string',
          enum: ['REQUIRED', 'CONTRIBUTING', 'SUPPORTING'],
          description: 'How the project contributes (default CONTRIBUTING)',
        },
      },
      required: ['projectId', 'goalId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'addSubtask',
    description:
      'Create a subtask under an existing task to break it into smaller pieces.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Parent task ID' },
        title: { type: 'string', description: 'Subtask title' },
        description: { type: 'string', description: 'Subtask description (optional)' },
      },
      required: ['taskId', 'title'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createPerson',
    description: 'Create a new person record in the organization.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name' },
        email: { type: 'string', description: 'Email address' },
        title: { type: 'string', description: 'Job title (optional)' },
        departmentId: { type: 'string', description: 'Department ID (optional)' },
        teamId: { type: 'string', description: 'Team ID (optional)' },
      },
      required: ['name', 'email'],
    },
    category: 'write',
    requiredRole: 'ADMIN',
  },
  {
    name: 'bulkReassignTasks',
    description:
      'Reassign multiple tasks to a new assignee. Accepts either an array of task IDs or an array of task objects (from listTasksByAssignee). Use after listTasksByAssignee to get the tasks.',
    parameters: {
      type: 'object',
      properties: {
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task IDs to reassign',
        },
        tasks: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' } } },
          description: 'Array of task objects from listTasksByAssignee (IDs extracted automatically)',
        },
        newAssigneeId: { type: 'string', description: 'The person/user ID to reassign tasks to' },
      },
      required: ['newAssigneeId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'removeProjectMember',
    description:
      'Remove a person from a project. Does not delete their tasks — reassign tasks first using bulkReassignTasks.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        personId: { type: 'string', description: 'The person/user ID to remove' },
      },
      required: ['projectId', 'personId'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'createDriveDocument',
    description:
      'Create a new Google Doc with a title and content. Optionally place it in a specific folder. Returns the file ID and link.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document content (plain text)' },
        folderId: { type: 'string', description: 'Optional parent folder ID' },
      },
      required: ['title', 'content'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
  {
    name: 'updateDriveDocument',
    description:
      'Update an existing Google Doc. Use mode "append" to add content to the end, or "replace" to overwrite the entire document. Use searchDriveFiles or readDriveDocument first to find the file ID.',
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'Google Drive file ID' },
        content: { type: 'string', description: 'New content (plain text)' },
        mode: {
          type: 'string',
          enum: ['append', 'replace'],
          description: '"append" adds to the end; "replace" overwrites the entire document',
        },
      },
      required: ['fileId', 'content', 'mode'],
    },
    category: 'write',
    requiredRole: 'MEMBER',
  },
]

// All tools combined
export const ALL_TOOLS: LoopbrainToolDef[] = [...READ_TOOLS, ...WRITE_TOOLS]

// Format for OpenAI API tool parameter
export function getOpenAITools(): Array<{
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}> {
  return ALL_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

// Get tools filtered by user role
export function getToolsForRole(
  role: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'
): LoopbrainToolDef[] {
  const roleHierarchy: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }
  const userLevel = roleHierarchy[role] ?? 0
  return ALL_TOOLS.filter((tool) => {
    const requiredLevel = roleHierarchy[tool.requiredRole] ?? 0
    return userLevel >= requiredLevel
  })
}

// Format tools for OpenAI API, filtered by role
export function getOpenAIToolsForRole(role: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'): Array<{
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}> {
  return getToolsForRole(role).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

// Get provider-agnostic tool definitions filtered by role
export function getToolDefinitionsForRole(
  role: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'
): import('@/lib/ai/providers').ToolDefinition[] {
  return getToolsForRole(role).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
}

// Check if a tool is a write tool (needs confirmation)
export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOLS.some((t) => t.name === toolName)
}

// Get tool definition by name
export function getToolDef(toolName: string): LoopbrainToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === toolName)
}
