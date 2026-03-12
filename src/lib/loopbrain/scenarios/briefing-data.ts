/**
 * Shared Briefing Data Layer
 *
 * Common data-gathering logic used by both the Daily Briefing and Meeting Prep
 * scenarios. Fetches user context, tasks, recent activity, calendar events,
 * health alerts, and active insights in parallel batches.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { resolveUserContext, type LoopbrainUserContext } from "@/lib/loopbrain/user-context";
import { loadCalendarEvents, type CalendarEvent } from "@/lib/loopbrain/context-sources/calendar";
import { loadGmailThreads } from "@/lib/loopbrain/context-sources/gmail";
import { loadSlackContextFromStore, type SlackStoredMessage } from "@/lib/loopbrain/context-sources/slack";
import { isSlackAvailable } from "@/lib/loopbrain/slack-helper";

// =============================================================================
// Public Types
// =============================================================================

export interface BriefingTaskItem {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  projectName: string | null;
}

export interface BriefingChangeItem {
  type: "task" | "page" | "project";
  title: string;
  action: string;
  actorName: string;
  timestamp: string;
}

export interface BriefingCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}

export interface BriefingHealthAlert {
  projectName: string;
  alertType: string;
  severity: string;
  title: string;
}

export interface BriefingInsight {
  title: string;
  category: string;
  severity: string;
}

export interface BriefingEmailItem {
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface BriefingSlackHighlight {
  channelName: string;
  topicSummary: string;
  messageCount: number;
  activeUsers: string[];
}

export interface BriefingData {
  user: LoopbrainUserContext;
  tasksToday: BriefingTaskItem[];
  tasksOverdue: BriefingTaskItem[];
  recentChanges: BriefingChangeItem[];
  calendarEvents: BriefingCalendarEvent[];
  healthAlerts: BriefingHealthAlert[];
  activeInsights: BriefingInsight[];
  recentEmails: BriefingEmailItem[];
  recentSlackHighlights: BriefingSlackHighlight[];
}

// =============================================================================
// Main Export
// =============================================================================

export async function gatherBriefingData(
  userId: string,
  workspaceId: string
): Promise<BriefingData> {
  const userCtx = await resolveUserContext(userId, workspaceId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [tasksToday, tasksOverdue, recentActivity, calendarRaw, healthAlerts, activeInsights, recentEmails, recentSlackHighlights] =
    await Promise.all([
      loadTasksDueToday(workspaceId, userId, todayStart, todayEnd),
      loadOverdueTasks(workspaceId, userId, todayStart),
      loadRecentChanges(workspaceId, userCtx.activeProjectIds, yesterday),
      loadCalendarEventsForBriefing(userId, workspaceId, todayStart, todayEnd),
      loadHealthAlerts(workspaceId, userCtx.activeProjectIds),
      loadActiveInsights(workspaceId),
      loadRecentEmailsForBriefing(userId, workspaceId),
      loadSlackHighlightsForBriefing(workspaceId),
    ]);

  return {
    user: userCtx,
    tasksToday,
    tasksOverdue,
    recentChanges: recentActivity,
    calendarEvents: calendarRaw,
    healthAlerts,
    activeInsights,
    recentEmails,
    recentSlackHighlights,
  };
}

// =============================================================================
// Data Loaders
// =============================================================================

async function loadTasksDueToday(
  workspaceId: string,
  userId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<BriefingTaskItem[]> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        assigneeId: userId,
        dueDate: { gte: todayStart, lt: todayEnd },
        status: { not: "DONE" },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { name: true } },
      },
      take: 20,
      orderBy: { dueDate: "asc" },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate?.toISOString() ?? "",
      projectName: t.project?.name ?? null,
    }));
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load tasks due today", { err });
    return [];
  }
}

async function loadOverdueTasks(
  workspaceId: string,
  userId: string,
  todayStart: Date
): Promise<BriefingTaskItem[]> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        assigneeId: userId,
        dueDate: { lt: todayStart },
        status: { not: "DONE" },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { name: true } },
      },
      take: 20,
      orderBy: { dueDate: "asc" },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate?.toISOString() ?? "",
      projectName: t.project?.name ?? null,
    }));
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load overdue tasks", { err });
    return [];
  }
}

async function loadRecentChanges(
  workspaceId: string,
  activeProjectIds: string[],
  since: Date
): Promise<BriefingChangeItem[]> {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        workspaceId,
        createdAt: { gte: since },
        ...(activeProjectIds.length > 0
          ? { entityId: { in: activeProjectIds } }
          : {}),
      },
      select: {
        entity: true,
        action: true,
        entityId: true,
        meta: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    return activities.map((a) => {
      const meta = (a.meta as Record<string, unknown>) ?? {};
      const entityTitle = (meta.title as string) ?? (meta.name as string) ?? a.entityId;
      const entityType = mapEntityType(a.entity);
      return {
        type: entityType,
        title: entityTitle,
        action: a.action,
        actorName: a.actor?.name ?? "Someone",
        timestamp: a.createdAt.toISOString(),
      };
    });
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load recent changes", { err });
    return [];
  }
}

function mapEntityType(entity: string): "task" | "page" | "project" {
  const lower = entity.toLowerCase();
  if (lower.includes("task")) return "task";
  if (lower.includes("page") || lower.includes("wiki")) return "page";
  return "project";
}

async function loadCalendarEventsForBriefing(
  userId: string,
  workspaceId: string,
  todayStart: Date,
  todayEnd: Date
): Promise<BriefingCalendarEvent[]> {
  try {
    const events: CalendarEvent[] = await loadCalendarEvents(
      workspaceId,
      userId,
      todayStart,
      todayEnd
    );

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      attendees: [],
    }));
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load calendar events", { err });
    return [];
  }
}

async function loadHealthAlerts(
  workspaceId: string,
  activeProjectIds: string[]
): Promise<BriefingHealthAlert[]> {
  if (activeProjectIds.length === 0) return [];

  try {
    const insights = await prisma.proactiveInsight.findMany({
      where: {
        workspaceId,
        category: "PROJECT",
        status: "ACTIVE",
      },
      select: {
        title: true,
        priority: true,
        metadata: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return insights
      .filter((i) => {
        const meta = (i.metadata as Record<string, unknown>) ?? {};
        const projectId = meta.projectId as string | undefined;
        return !projectId || activeProjectIds.includes(projectId);
      })
      .map((i) => {
        const meta = (i.metadata as Record<string, unknown>) ?? {};
        return {
          projectName: (meta.projectName as string) ?? "Unknown Project",
          alertType: (meta.alertType as string) ?? "unknown",
          severity: i.priority,
          title: i.title,
        };
      });
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load health alerts", { err });
    return [];
  }
}

async function loadActiveInsights(
  workspaceId: string
): Promise<BriefingInsight[]> {
  try {
    const insights = await prisma.proactiveInsight.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        category: { notIn: ["PROJECT", "ONBOARDING", "DAILY_BRIEFING", "MEETING_PREP"] },
      },
      select: {
        title: true,
        category: true,
        priority: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return insights.map((i) => ({
      title: i.title,
      category: i.category,
      severity: i.priority,
    }));
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load active insights", { err });
    return [];
  }
}

async function loadRecentEmailsForBriefing(
  userId: string,
  workspaceId: string
): Promise<BriefingEmailItem[]> {
  try {
    const threads = await loadGmailThreads(userId, workspaceId, {
      maxResults: 5,
      query: "newer_than:1d -category:promotions -category:social -in:spam -in:trash",
    });

    return threads.map((t) => ({
      subject: t.subject,
      from: t.from,
      date: t.date.toISOString(),
      snippet: t.snippet || t.bodyPreview.slice(0, 200),
    }));
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load recent emails", { err });
    return [];
  }
}

async function loadSlackHighlightsForBriefing(
  workspaceId: string
): Promise<BriefingSlackHighlight[]> {
  try {
    const available = await isSlackAvailable(workspaceId);
    if (!available) return [];

    const messages: SlackStoredMessage[] = await loadSlackContextFromStore(workspaceId, 100);
    if (messages.length === 0) return [];

    // Group by channel and compute highlights
    const byChannel = new Map<string, SlackStoredMessage[]>();
    for (const msg of messages) {
      const key = msg.channelName || msg.channelId;
      if (!byChannel.has(key)) byChannel.set(key, []);
      byChannel.get(key)!.push(msg);
    }

    const highlights: BriefingSlackHighlight[] = [];
    for (const [channelName, channelMsgs] of byChannel) {
      const activeUsers = [...new Set(channelMsgs.map((m) => m.userName))];
      const recentTexts = channelMsgs.slice(0, 5).map((m) => m.text.slice(0, 100));
      const topicSummary = recentTexts.join(" | ").slice(0, 300);

      highlights.push({
        channelName,
        topicSummary,
        messageCount: channelMsgs.length,
        activeUsers: activeUsers.slice(0, 5),
      });
    }

    // Sort by message count descending, return top 5
    return highlights
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);
  } catch (err: unknown) {
    logger.warn("[briefing-data] Failed to load Slack highlights", { err });
    return [];
  }
}
