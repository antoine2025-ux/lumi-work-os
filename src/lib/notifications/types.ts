export const NOTIFICATION_TYPES = [
  {
    key: 'task.assigned',
    label: 'Task assignments',
    description: 'When someone assigns a task to you',
  },
  {
    key: 'MENTION',
    label: 'Mentions',
    description: 'When someone @mentions you in a page or comment',
  },
  {
    key: 'comment',
    label: 'Comments',
    description: 'When someone comments on your task or wiki page',
  },
  {
    key: 'loopbrain.insight',
    label: 'Loopbrain insights',
    description: 'Proactive insights and recommendations from Loopbrain',
  },
  {
    key: 'PROJECT_HEALTH_CRITICAL',
    label: 'Project health alerts',
    description: 'Critical alerts about project risks and blockers',
  },
  {
    key: 'daily_digest',
    label: 'Daily email digest',
    description: 'Daily summary of unread notifications via email (coming soon)',
  },
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['key']
