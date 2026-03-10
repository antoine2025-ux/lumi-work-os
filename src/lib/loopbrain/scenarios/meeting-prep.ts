/**
 * Meeting Prep Brief Generator
 *
 * Generates a context package for an upcoming meeting, including:
 *   1. Meeting details (title, time, attendees)
 *   2. Attendee context (role, team, recent activity)
 *   3. Project context (if meeting references a project)
 *   4. Recent wiki pages edited by attendees
 *   5. Suggested talking points
 *
 * Caching: result is persisted as a ProactiveInsight (category: MEETING_PREP)
 * keyed by eventId. Notifications are created for upcoming meetings.
 */

import { Prisma } from "@prisma/client";
import { prisma, prismaUnscoped } from "@/lib/db";
import { logger } from "@/lib/logger";
import { google } from "googleapis";
import { callLoopbrainLLM } from "@/lib/loopbrain/orchestrator";
import { createNotification } from "@/lib/notifications/create";
import { loadCalendarEvents } from "@/lib/loopbrain/context-sources/calendar";
import { loadGmailThreads, type GmailThreadSummary } from "@/lib/loopbrain/context-sources/gmail";
import { searchSlackMessages } from "@/lib/loopbrain/context-sources/slack-search";
import { isSlackAvailable } from "@/lib/loopbrain/slack-helper";

// =============================================================================
// Public Types
// =============================================================================

export interface MeetingPrepAttendee {
  name: string;
  role?: string;
  team?: string;
  recentActivity?: string;
  personId?: string;
}

export interface MeetingPrepProjectContext {
  projectName: string;
  healthStatus: string;
  recentTasks: string[];
  blockers: string[];
}

export interface MeetingPrepDoc {
  title: string;
  editedBy: string;
  href: string;
}

export interface MeetingPrepSlackContext {
  channelName: string;
  messageCount: number;
  summary: string;
}

export interface MeetingPrepBrief {
  meetingTitle: string;
  meetingTime: string;
  attendees: MeetingPrepAttendee[];
  projectContext?: MeetingPrepProjectContext;
  suggestedTopics: string[];
  recentDocs: MeetingPrepDoc[];
  slackContext?: MeetingPrepSlackContext[];
  generatedAt: string;
}

// =============================================================================
// Internal Types
// =============================================================================

interface RichCalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
}

// =============================================================================
// Constants
// =============================================================================

const BRIEFING_EXPIRY_DAYS = 1;
const RECENT_ACTIVITY_DAYS = 7;

// =============================================================================
// Main Exports
// =============================================================================

export async function generateMeetingPrep(
  userId: string,
  workspaceId: string,
  eventId: string
): Promise<MeetingPrepBrief> {
  const startTime = Date.now();

  // ── 1. Check cache ────────────────────────────────────────────────────────
  const cached = await findCachedMeetingPrep(workspaceId, eventId);
  if (cached) {
    logger.info("[meeting-prep] Returning cached prep", { userId, eventId });
    return cached;
  }

  // ── 2. Fetch enriched calendar event ──────────────────────────────────────
  const event = await fetchRichCalendarEvent(userId, eventId);
  if (!event) {
    return buildNoEventBrief(eventId);
  }

  // ── 3. Map attendees to workspace members ─────────────────────────────────
  const attendees = await resolveAttendees(workspaceId, event.attendeeEmails);

  // ── 4. Gather attendee activity ───────────────────────────────────────────
  const attendeesWithActivity = await enrichAttendeesWithActivity(
    workspaceId,
    attendees
  );

  // ── 5. Detect project context ─────────────────────────────────────────────
  const projectContext = await detectProjectContext(
    workspaceId,
    event.title,
    event.description
  );

  // ── 6. Fetch recent docs by attendees ─────────────────────────────────────
  const recentDocs = await loadRecentDocsByAttendees(
    workspaceId,
    attendees.filter((a) => a.personId).map((a) => a.personId!)
  );

  // ── 6b. Fetch recent emails from/to attendees ──────────────────────────
  const attendeeEmails = await loadAttendeeEmailContext(
    userId,
    workspaceId,
    event.attendeeEmails
  );

  // ── 6c. Fetch Slack context related to meeting topic ──────────────────
  let slackContext: MeetingPrepSlackContext[] = [];
  try {
    const slackAvailable = await isSlackAvailable(workspaceId);
    if (slackAvailable) {
      const searchQuery = event.title;
      const slackResult = await searchSlackMessages(workspaceId, searchQuery, 10);
      if (slackResult.messages.length > 0) {
        const byChannel = new Map<string, typeof slackResult.messages>();
        for (const msg of slackResult.messages) {
          if (!byChannel.has(msg.channelName)) byChannel.set(msg.channelName, []);
          byChannel.get(msg.channelName)!.push(msg);
        }
        for (const [channelName, msgs] of byChannel) {
          slackContext.push({
            channelName,
            messageCount: msgs.length,
            summary: msgs.slice(0, 3).map((m) => `${m.userName}: ${m.text.slice(0, 100)}`).join(' | '),
          });
        }
      }
    }
  } catch (err) {
    logger.warn("[meeting-prep] Failed to load Slack context", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── 7. Call LLM ───────────────────────────────────────────────────────────
  const prompt = buildMeetingPrepPrompt(
    event,
    attendeesWithActivity,
    projectContext,
    recentDocs,
    attendeeEmails,
    slackContext
  );

  let brief: MeetingPrepBrief;
  try {
    const llmResult = await callLoopbrainLLM(prompt, MEETING_PREP_SYSTEM_PROMPT, {
      maxTokens: 2000,
      timeoutMs: 15000,
    });
    const parsed = parseMeetingPrepResponse(llmResult.content, event, attendeesWithActivity, projectContext, recentDocs);
    brief = slackContext.length > 0 ? { ...parsed, slackContext } : parsed;
  } catch (err) {
    logger.warn("[meeting-prep] LLM call failed, using fallback", {
      userId,
      eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    const fallback = buildFallbackBrief(event, attendeesWithActivity, projectContext, recentDocs);
    brief = slackContext.length > 0 ? { ...fallback, slackContext } : fallback;
  }

  // ── 8. Persist ────────────────────────────────────────────────────────────
  await persistMeetingPrep(userId, workspaceId, eventId, brief);

  const elapsed = Date.now() - startTime;
  logger.info("[meeting-prep] Prep generated", { userId, eventId, elapsed });

  return brief;
}

export async function generateNextMeetingPrep(
  userId: string,
  workspaceId: string
): Promise<MeetingPrepBrief> {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const events = await loadCalendarEvents(workspaceId, userId, now, todayEnd);
  const nextEvent = events.find((e) => e.startTime > now);

  if (!nextEvent) {
    return {
      meetingTitle: "No upcoming meetings",
      meetingTime: "",
      attendees: [],
      suggestedTopics: [],
      recentDocs: [],
      generatedAt: new Date().toISOString(),
    };
  }

  return generateMeetingPrep(userId, workspaceId, nextEvent.id);
}

/**
 * Finds today's events by title (case-insensitive includes).
 * Returns the matching event ID, or null if no match.
 */
export async function findEventByTitle(
  userId: string,
  workspaceId: string,
  titleFragment: string
): Promise<string | null> {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const events = await loadCalendarEvents(workspaceId, userId, now, todayEnd);
  const normalized = titleFragment.toLowerCase().trim();

  const upcoming = events
    .filter((e) => e.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const match = upcoming.find((e) =>
    e.title.toLowerCase().includes(normalized)
  );

  return match?.id ?? null;
}

export async function triggerUpcomingMeetingPreps(
  workspaceId: string
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 15 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });

  for (const member of members) {
    try {
      const events = await loadCalendarEvents(
        workspaceId,
        member.userId,
        windowStart,
        windowEnd
      );

      for (const event of events) {
        const existing = await findCachedMeetingPrep(workspaceId, event.id);
        if (existing) continue;

        const brief = await generateMeetingPrep(
          member.userId,
          workspaceId,
          event.id
        );

        await createNotification({
          workspaceId,
          recipientId: member.userId,
          type: "meeting_prep",
          title: `Meeting prep ready for "${brief.meetingTitle}"`,
          body: `Your meeting starts at ${brief.meetingTime}. Loopbrain has prepared a context brief.`,
          entityType: "calendar_event",
          entityId: event.id,
          url: "/home",
        });
      }
    } catch (err) {
      logger.warn("[meeting-prep] Failed to trigger prep for member", {
        userId: member.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// =============================================================================
// Cache Helpers
// =============================================================================

async function findCachedMeetingPrep(
  workspaceId: string,
  eventId: string
): Promise<MeetingPrepBrief | null> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const insight = await prisma.proactiveInsight.findFirst({
    where: {
      workspaceId,
      category: "MEETING_PREP",
      status: "ACTIVE",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!insight?.metadata) return null;

  const meta = insight.metadata as Record<string, unknown>;
  if (meta.eventId !== eventId) return null;

  return (meta.brief as MeetingPrepBrief) ?? null;
}

async function persistMeetingPrep(
  userId: string,
  workspaceId: string,
  eventId: string,
  brief: MeetingPrepBrief
): Promise<void> {
  const expiresAt = new Date(Date.now() + BRIEFING_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  try {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId,
        trigger: "SCHEDULED_CHECK",
        category: "MEETING_PREP",
        priority: "INFO",
        title: `Meeting prep: ${brief.meetingTitle}`,
        description: `Context brief for "${brief.meetingTitle}" at ${brief.meetingTime}`,
        confidence: 0.8,
        recommendations: [],
        evidence: [],
        affectedEntities: [],
        status: "ACTIVE",
        expiresAt,
        metadata: JSON.parse(JSON.stringify({ userId, eventId, brief })) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logger.warn("[meeting-prep] Failed to persist prep insight", {
      userId,
      eventId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// =============================================================================
// Calendar Event Fetching (enriched with attendees)
// =============================================================================

async function fetchRichCalendarEvent(
  userId: string,
  eventId: string
): Promise<RichCalendarEvent | null> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return null;
    }

    const account = await prismaUnscoped.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });

    if (!account?.access_token) return null;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? undefined,
      expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    });

    const cal = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await cal.events.get({
      calendarId: "primary",
      eventId,
    });

    const e = response.data;
    if (!e.start || !e.end) return null;

    return {
      id: e.id ?? eventId,
      title: e.summary ?? "(No title)",
      description: e.description ?? "",
      startTime: new Date(e.start.dateTime ?? e.start.date ?? ""),
      endTime: new Date(e.end.dateTime ?? e.end.date ?? ""),
      attendeeEmails: (e.attendees ?? [])
        .map((a) => a.email)
        .filter((email): email is string => typeof email === "string"),
    };
  } catch (err) {
    logger.warn("[meeting-prep] Failed to fetch calendar event", {
      userId,
      eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// =============================================================================
// Attendee Resolution
// =============================================================================

async function resolveAttendees(
  workspaceId: string,
  emails: string[]
): Promise<MeetingPrepAttendee[]> {
  if (emails.length === 0) return [];

  try {
    const users = await prisma.user.findMany({
      where: {
        email: { in: emails },
        workspaceMemberships: { some: { workspaceId } },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userIds = users.map((u) => u.id);
    const positions = userIds.length > 0
      ? await prisma.orgPosition.findMany({
          where: { workspaceId, userId: { in: userIds }, isActive: true },
          select: {
            userId: true,
            title: true,
            team: { select: { name: true } },
          },
        })
      : [];
    const positionMap = new Map(positions.map((p) => [p.userId, p]));

    const userMap = new Map(users.map((u) => [u.email, u]));

    return emails.map((email) => {
      const user = userMap.get(email);
      if (!user) {
        return { name: email };
      }
      const pos = positionMap.get(user.id);
      return {
        name: user.name ?? email,
        role: pos?.title ?? undefined,
        team: pos?.team?.name ?? undefined,
        personId: user.id,
      };
    });
  } catch (err) {
    logger.warn("[meeting-prep] Failed to resolve attendees", { err });
    return emails.map((email) => ({ name: email }));
  }
}

async function enrichAttendeesWithActivity(
  workspaceId: string,
  attendees: MeetingPrepAttendee[]
): Promise<MeetingPrepAttendee[]> {
  const since = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  return Promise.all(
    attendees.map(async (attendee) => {
      if (!attendee.personId) return attendee;

      try {
        const [taskCount, pageCount] = await Promise.all([
          prisma.task.count({
            where: {
              workspaceId,
              assigneeId: attendee.personId,
              status: "DONE",
              updatedAt: { gte: since },
            },
          }),
          prisma.wikiPage.count({
            where: {
              workspaceId,
              createdById: attendee.personId,
              updatedAt: { gte: since },
            },
          }),
        ]);

        const parts: string[] = [];
        if (taskCount > 0) parts.push(`Completed ${taskCount} task${taskCount !== 1 ? "s" : ""}`);
        if (pageCount > 0) parts.push(`edited ${pageCount} wiki page${pageCount !== 1 ? "s" : ""}`);

        return {
          ...attendee,
          recentActivity: parts.length > 0 ? parts.join(", ") + " this week" : undefined,
        };
      } catch {
        return attendee;
      }
    })
  );
}

// =============================================================================
// Project Context Detection
// =============================================================================

async function detectProjectContext(
  workspaceId: string,
  meetingTitle: string,
  meetingDescription: string
): Promise<MeetingPrepProjectContext | null> {
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true, name: true, status: true },
      take: 50,
    });

    const combined = `${meetingTitle} ${meetingDescription}`.toLowerCase();
    const matched = projects.find((p) =>
      combined.includes(p.name.toLowerCase())
    );

    if (!matched) return null;

    const [recentTasks, blockerTasks, healthInsight] = await Promise.all([
      prisma.task.findMany({
        where: {
          workspaceId,
          projectId: matched.id,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { title: true, status: true },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: {
          workspaceId,
          projectId: matched.id,
          status: "BLOCKED",
        },
        select: { title: true },
        take: 5,
      }),
      prisma.proactiveInsight.findFirst({
        where: {
          workspaceId,
          category: "PROJECT",
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const healthMeta = (healthInsight?.metadata as Record<string, unknown>) ?? {};
    const healthProjectId = healthMeta.projectId as string | undefined;

    return {
      projectName: matched.name,
      healthStatus: healthProjectId === matched.id
        ? (healthInsight?.priority ?? matched.status)
        : matched.status,
      recentTasks: recentTasks.map((t) => `${t.title} [${t.status}]`),
      blockers: blockerTasks.map((t) => t.title),
    };
  } catch (err) {
    logger.warn("[meeting-prep] Failed to detect project context", { err });
    return null;
  }
}

// =============================================================================
// Recent Docs
// =============================================================================

async function loadRecentDocsByAttendees(
  workspaceId: string,
  userIds: string[]
): Promise<MeetingPrepDoc[]> {
  if (userIds.length === 0) return [];

  try {
    const since = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const pages = await prisma.wikiPage.findMany({
      where: {
        workspaceId,
        createdById: { in: userIds },
        updatedAt: { gte: since },
      },
      select: {
        id: true,
        title: true,
        spaceId: true,
        createdBy: { select: { name: true } },
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });

    return pages.map((p) => ({
      title: p.title,
      editedBy: p.createdBy?.name ?? "Unknown",
      href: `/wiki/${p.spaceId}/${p.id}`,
    }));
  } catch (err) {
    logger.warn("[meeting-prep] Failed to load recent docs", { err });
    return [];
  }
}

// =============================================================================
// Attendee Email Context
// =============================================================================

async function loadAttendeeEmailContext(
  userId: string,
  workspaceId: string,
  attendeeEmails: string[]
): Promise<GmailThreadSummary[]> {
  if (attendeeEmails.length === 0) return [];

  try {
    const names = attendeeEmails
      .map((e) => e.split("@")[0])
      .filter(Boolean)
      .slice(0, 5);
    if (names.length === 0) return [];

    const query = `newer_than:7d (${names.map((n) => `from:${n} OR to:${n}`).join(" OR ")})`;
    const threads = await loadGmailThreads(userId, workspaceId, {
      query,
      maxResults: 10,
      includeBodyPreview: false,
    });

    return threads;
  } catch (err) {
    logger.warn("[meeting-prep] Failed to load attendee email context", { err });
    return [];
  }
}

// =============================================================================
// LLM Prompt
// =============================================================================

const MEETING_PREP_SYSTEM_PROMPT = `You are Loopbrain, an intelligent workspace assistant.
Your task is to generate a meeting prep brief. Focus on what the user needs to know
before this meeting — be specific, actionable, and concise.
Maximum length: ~600 words.

Respond with ONLY a valid JSON object (no markdown fences, no extra text) matching this shape:
{
  "suggestedTopics": ["string — specific talking point or question"],
  "summary": "string — 2-3 sentence overview of what this meeting is about and what to focus on"
}

Base your suggested topics on:
- The meeting title and description
- Attendee roles and recent activity
- Project status, blockers, and recent tasks (if project context is provided)
- Recent wiki pages edited by attendees

Suggest 3-6 specific, actionable topics. Not generic advice.`;

function buildMeetingPrepPrompt(
  event: RichCalendarEvent,
  attendees: MeetingPrepAttendee[],
  projectContext: MeetingPrepProjectContext | null,
  recentDocs: MeetingPrepDoc[],
  attendeeEmails: GmailThreadSummary[] = [],
  slackContext: MeetingPrepSlackContext[] = []
): string {
  const lines: string[] = [];

  lines.push(`## Meeting`);
  lines.push(`Title: ${event.title}`);
  lines.push(`Time: ${event.startTime.toLocaleString()}`);
  if (event.description) {
    lines.push(`Description: ${event.description.slice(0, 500)}`);
  }
  lines.push(``);

  lines.push(`## Attendees (${attendees.length})`);
  for (const a of attendees) {
    const parts = [a.name];
    if (a.role) parts.push(`Role: ${a.role}`);
    if (a.team) parts.push(`Team: ${a.team}`);
    if (a.recentActivity) parts.push(`Recent: ${a.recentActivity}`);
    lines.push(`- ${parts.join(" | ")}`);
  }
  lines.push(``);

  if (projectContext) {
    lines.push(`## Project Context: ${projectContext.projectName}`);
    lines.push(`Health: ${projectContext.healthStatus}`);
    if (projectContext.recentTasks.length > 0) {
      lines.push(`Recent tasks:`);
      for (const t of projectContext.recentTasks.slice(0, 5)) {
        lines.push(`  - ${t}`);
      }
    }
    if (projectContext.blockers.length > 0) {
      lines.push(`Blockers:`);
      for (const b of projectContext.blockers) {
        lines.push(`  - ${b}`);
      }
    }
    lines.push(``);
  }

  if (recentDocs.length > 0) {
    lines.push(`## Recent Docs by Attendees`);
    for (const d of recentDocs) {
      lines.push(`- "${d.title}" edited by ${d.editedBy}`);
    }
    lines.push(``);
  }

  if (attendeeEmails.length > 0) {
    lines.push(`## Recent Emails with Attendees (last 7 days)`);
    for (const e of attendeeEmails.slice(0, 5)) {
      const dateStr = e.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      lines.push(`- From: ${e.from} | ${dateStr} — "${e.subject}"`);
      if (e.snippet) lines.push(`  ${e.snippet.slice(0, 150)}`);
    }
    lines.push(``);
  }

  if (slackContext.length > 0) {
    lines.push(`## Related Slack Discussions`);
    for (const s of slackContext) {
      lines.push(`- #${s.channelName} (${s.messageCount} messages): ${s.summary.slice(0, 200)}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// =============================================================================
// LLM Response Parser
// =============================================================================

function parseMeetingPrepResponse(
  content: string,
  event: RichCalendarEvent,
  attendees: MeetingPrepAttendee[],
  projectContext: MeetingPrepProjectContext | null,
  recentDocs: MeetingPrepDoc[]
): MeetingPrepBrief {
  let raw: Record<string, unknown>;

  try {
    const cleaned = content
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    raw = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    logger.warn("[meeting-prep] LLM returned non-JSON, using fallback");
    return buildFallbackBrief(event, attendees, projectContext, recentDocs);
  }

  const suggestedTopics = Array.isArray(raw.suggestedTopics)
    ? raw.suggestedTopics.filter((t): t is string => typeof t === "string")
    : [];

  return {
    meetingTitle: event.title,
    meetingTime: event.startTime.toLocaleString(),
    attendees,
    projectContext: projectContext ?? undefined,
    suggestedTopics,
    recentDocs,
    generatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Fallback Briefs
// =============================================================================

function buildNoEventBrief(_eventId: string): MeetingPrepBrief {
  return {
    meetingTitle: "Event not found",
    meetingTime: "",
    attendees: [],
    suggestedTopics: [],
    recentDocs: [],
    generatedAt: new Date().toISOString(),
  };
}

function buildFallbackBrief(
  event: RichCalendarEvent,
  attendees: MeetingPrepAttendee[],
  projectContext: MeetingPrepProjectContext | null,
  recentDocs: MeetingPrepDoc[]
): MeetingPrepBrief {
  const topics: string[] = [];

  if (projectContext) {
    topics.push(`Review ${projectContext.projectName} status (${projectContext.healthStatus})`);
    if (projectContext.blockers.length > 0) {
      topics.push(`Discuss blockers: ${projectContext.blockers.slice(0, 2).join(", ")}`);
    }
  }

  if (recentDocs.length > 0) {
    topics.push(`Review recent doc updates by attendees`);
  }

  if (topics.length === 0) {
    topics.push("Review agenda and action items from last meeting");
  }

  return {
    meetingTitle: event.title,
    meetingTime: event.startTime.toLocaleString(),
    attendees,
    projectContext: projectContext ?? undefined,
    suggestedTopics: topics,
    recentDocs,
    generatedAt: new Date().toISOString(),
  };
}
