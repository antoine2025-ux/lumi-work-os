/**
 * Daily Briefing Generator
 *
 * Generates a personalized daily briefing for a workspace user covering:
 *   1. Tasks due today and overdue
 *   2. Changes since last session (activity in user's projects)
 *   3. Today's calendar events
 *   4. Active project health alerts
 *   5. Proactive insights from Loopbrain
 *
 * Caching: result is persisted as a ProactiveInsight (category: DAILY_BRIEFING)
 * and re-used for up to 4 hours within the same day. Regenerated on demand.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { callLoopbrainLLM } from "@/lib/loopbrain/llm-caller";
import { gatherBriefingData, type BriefingData } from "./briefing-data";

// =============================================================================
// Public Types
// =============================================================================

export type DailyBriefingSectionIcon =
  | "check-circle"
  | "activity"
  | "calendar"
  | "alert-triangle"
  | "lightbulb"
  | "message-circle";

export interface DailyBriefingSection {
  title: string;
  icon: DailyBriefingSectionIcon;
  content: string;
  items?: Array<{ text: string; href?: string; badge?: string }>;
}

export interface DailyBriefingAction {
  title: string;
  priority: "high" | "medium" | "low";
  href?: string;
}

export interface DailyBriefing {
  greeting: string;
  date: string;
  sections: DailyBriefingSection[];
  keyActions: DailyBriefingAction[];
  generatedAt: string;
  confidence: "high" | "medium" | "low";
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours
const BRIEFING_EXPIRY_DAYS = 1;

// =============================================================================
// Main Export
// =============================================================================

export async function generateDailyBriefing(
  userId: string,
  workspaceId: string
): Promise<DailyBriefing> {
  const startTime = Date.now();

  // ── 1. Cache check ────────────────────────────────────────────────────────
  const cached = await findCachedDailyBriefing(userId, workspaceId);
  if (cached) {
    logger.info("[daily-briefing] Returning cached briefing", { userId, workspaceId });
    return cached;
  }

  // ── 2. Gather data ────────────────────────────────────────────────────────
  const data = await gatherBriefingData(userId, workspaceId);

  // ── 3. Minimal data guard — skip LLM if nothing to report ─────────────────
  const hasContent =
    data.tasksToday.length > 0 ||
    data.tasksOverdue.length > 0 ||
    data.calendarEvents.length > 0 ||
    data.recentChanges.length > 0 ||
    data.healthAlerts.length > 0 ||
    data.recentEmails.length > 0 ||
    data.recentSlackHighlights.length > 0;

  if (!hasContent) {
    const briefing = buildAllClearBriefing(data.user.name);
    await persistDailyBriefing(userId, workspaceId, briefing);
    return briefing;
  }

  // ── 4. Call LLM ───────────────────────────────────────────────────────────
  const prompt = buildDailyBriefingPrompt(data);
  let llmResult: { content: string };
  try {
    llmResult = await callLoopbrainLLM(prompt, DAILY_BRIEFING_SYSTEM_PROMPT, {
      maxTokens: 2000,
      timeoutMs: 15000,
    });
  } catch (err: unknown) {
    logger.warn("[daily-briefing] LLM call failed, using fallback", {
      userId,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    const fallback = buildFallbackBriefing(data);
    await persistDailyBriefing(userId, workspaceId, fallback);
    return fallback;
  }

  // ── 5. Parse LLM response ────────────────────────────────────────────────
  const briefing = parseDailyBriefingResponse(llmResult.content, data);

  // ── 6. Persist ────────────────────────────────────────────────────────────
  await persistDailyBriefing(userId, workspaceId, briefing);

  const elapsed = Date.now() - startTime;
  logger.info("[daily-briefing] Briefing generated", { userId, workspaceId, elapsed });

  return briefing;
}

// =============================================================================
// Cache Helpers
// =============================================================================

async function findCachedDailyBriefing(
  userId: string,
  workspaceId: string
): Promise<DailyBriefing | null> {
  const now = new Date();
  const today6am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
  const cutoff = new Date(Math.max(today6am.getTime(), now.getTime() - CACHE_MAX_AGE_MS));

  const insight = await prisma.proactiveInsight.findFirst({
    where: {
      workspaceId,
      category: "DAILY_BRIEFING",
      status: "ACTIVE",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!insight?.metadata) return null;

  const meta = insight.metadata as Record<string, unknown>;
  if (meta.userId !== userId) return null;

  const briefing = meta.briefing as DailyBriefing | undefined;
  if (!briefing) return null;

  return briefing;
}

async function persistDailyBriefing(
  userId: string,
  workspaceId: string,
  briefing: DailyBriefing
): Promise<void> {
  const expiresAt = new Date(Date.now() + BRIEFING_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  try {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId,
        trigger: "SCHEDULED_CHECK",
        category: "DAILY_BRIEFING",
        priority: "INFO",
        title: `Daily briefing for ${userId}`,
        description: briefing.greeting,
        confidence: briefing.confidence === "high" ? 0.9 : briefing.confidence === "medium" ? 0.7 : 0.5,
        recommendations: [],
        evidence: [],
        affectedEntities: [],
        status: "ACTIVE",
        expiresAt,
        metadata: JSON.parse(JSON.stringify({ userId, briefing })) as Prisma.InputJsonValue,
      },
    });
  } catch (err: unknown) {
    logger.warn("[daily-briefing] Failed to persist briefing insight", {
      userId,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// =============================================================================
// LLM Prompt
// =============================================================================

const DAILY_BRIEFING_SYSTEM_PROMPT = `You are Loopbrain, an intelligent workspace assistant.
Your task is to generate a concise, actionable daily briefing for a workspace user.
Be specific and reference real data — never be generic or vague.
Maximum length: ~800 words across all sections combined.

Respond with ONLY a valid JSON object (no markdown fences, no extra text) matching this shape:
{
  "greeting": "string — Good morning/afternoon, [name]!",
  "sections": [
    {
      "title": "string",
      "icon": "check-circle|activity|calendar|alert-triangle|lightbulb",
      "content": "string — markdown formatted, concise",
      "items": [{ "text": "string", "href": "__PLACEHOLDER__", "badge": "optional status" }]
    }
  ],
  "keyActions": [
    { "title": "string — specific action to take", "priority": "high|medium|low", "href": "__PLACEHOLDER__" }
  ]
}

Include sections in this order (omit a section if there's no data for it):
1. "Your Tasks" (icon: check-circle) — tasks due today and overdue
2. "What Changed" (icon: activity) — recent activity in your projects
3. "Today's Meetings" (icon: calendar) — calendar events
4. "Recent Emails" (icon: activity) — notable recent emails
5. "Slack Highlights" (icon: message-circle) — active discussions in Slack channels
6. "Heads Up" (icon: alert-triangle) — health alerts and warnings
7. "Insights" (icon: lightbulb) — proactive observations

Set href to "__PLACEHOLDER__" — URLs are injected programmatically.
Focus on what the user needs to DO, not just what happened.`;

function buildDailyBriefingPrompt(data: BriefingData): string {
  const lines: string[] = [];

  lines.push(`## User`);
  lines.push(`Name: ${data.user.name}`);
  lines.push(`Role: ${data.user.role}`);
  if (data.user.title) lines.push(`Title: ${data.user.title}`);
  if (data.user.teamName) lines.push(`Team: ${data.user.teamName}`);
  lines.push(``);

  if (data.tasksToday.length > 0) {
    lines.push(`## Tasks Due Today (${data.tasksToday.length})`);
    for (const t of data.tasksToday) {
      lines.push(`- [${t.status}] ${t.title}${t.projectName ? ` (${t.projectName})` : ""}`);
    }
    lines.push(``);
  }

  if (data.tasksOverdue.length > 0) {
    lines.push(`## Overdue Tasks (${data.tasksOverdue.length})`);
    for (const t of data.tasksOverdue) {
      lines.push(`- [${t.status}] ${t.title} — due ${t.dueDate.split("T")[0]}${t.projectName ? ` (${t.projectName})` : ""}`);
    }
    lines.push(``);
  }

  if (data.recentChanges.length > 0) {
    lines.push(`## Recent Changes (last 24h, ${data.recentChanges.length} items)`);
    for (const c of data.recentChanges.slice(0, 15)) {
      lines.push(`- ${c.actorName} ${c.action} ${c.type}: "${c.title}"`);
    }
    lines.push(``);
  }

  if (data.calendarEvents.length > 0) {
    lines.push(`## Today's Calendar (${data.calendarEvents.length} events)`);
    for (const e of data.calendarEvents) {
      const time = new Date(e.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      lines.push(`- ${time}: ${e.title}`);
    }
    lines.push(``);
  }

  if (data.healthAlerts.length > 0) {
    lines.push(`## Health Alerts (${data.healthAlerts.length})`);
    for (const a of data.healthAlerts) {
      lines.push(`- [${a.severity}] ${a.title} — ${a.projectName}`);
    }
    lines.push(``);
  }

  if (data.recentEmails.length > 0) {
    lines.push(`## Recent Emails (${data.recentEmails.length})`);
    for (const e of data.recentEmails) {
      const dateStr = new Date(e.date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      lines.push(`- From: ${e.from} | ${dateStr} — "${e.subject}"`);
      if (e.snippet) lines.push(`  ${e.snippet.slice(0, 150)}`);
    }
    lines.push(``);
  }

  if (data.recentSlackHighlights.length > 0) {
    lines.push(`## Slack Highlights (${data.recentSlackHighlights.length} active channels)`);
    for (const h of data.recentSlackHighlights) {
      lines.push(`- #${h.channelName}: ${h.messageCount} messages — ${h.activeUsers.join(", ")}`);
      if (h.topicSummary) lines.push(`  Topics: ${h.topicSummary.slice(0, 200)}`);
    }
    lines.push(``);
  }

  if (data.activeInsights.length > 0) {
    lines.push(`## Active Insights (${data.activeInsights.length})`);
    for (const i of data.activeInsights) {
      lines.push(`- [${i.category}] ${i.title}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// =============================================================================
// LLM Response Parser
// =============================================================================

function parseDailyBriefingResponse(content: string, data: BriefingData): DailyBriefing {
  let raw: Record<string, unknown>;

  try {
    const cleaned = content
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    raw = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    logger.warn("[daily-briefing] LLM returned non-JSON, using fallback");
    return buildFallbackBriefing(data);
  }

  const sections: DailyBriefingSection[] = [];
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  for (const s of rawSections) {
    if (typeof s === "object" && s !== null) {
      const sec = s as Record<string, unknown>;
      if (typeof sec.title === "string" && typeof sec.content === "string") {
        const rawItems = Array.isArray(sec.items) ? sec.items : [];
        sections.push({
          title: sec.title,
          icon: isValidIcon(sec.icon) ? sec.icon : "lightbulb",
          content: sec.content,
          items: rawItems
            .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
            .map((i) => ({
              text: String(i.text ?? ""),
              href: typeof i.href === "string" ? i.href : undefined,
              badge: typeof i.badge === "string" ? i.badge : undefined,
            })),
        });
      }
    }
  }

  const rawActions = Array.isArray(raw.keyActions) ? raw.keyActions : [];
  const keyActions: DailyBriefingAction[] = rawActions
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      title: String(a.title ?? "Action"),
      priority: isPriority(a.priority) ? a.priority : "medium",
      href: typeof a.href === "string" ? a.href : undefined,
    }));

  const today = new Date();

  return {
    greeting: String(raw.greeting ?? `Good morning, ${data.user.name}!`),
    date: today.toISOString().split("T")[0],
    sections,
    keyActions: injectActionUrls(keyActions, data),
    generatedAt: today.toISOString(),
    confidence: sections.length >= 3 ? "high" : sections.length >= 1 ? "medium" : "low",
  };
}

function isValidIcon(v: unknown): v is DailyBriefingSectionIcon {
  return (
    v === "check-circle" ||
    v === "activity" ||
    v === "calendar" ||
    v === "alert-triangle" ||
    v === "lightbulb"
  );
}

function isPriority(v: unknown): v is "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low";
}

function injectActionUrls(
  actions: DailyBriefingAction[],
  data: BriefingData
): DailyBriefingAction[] {
  return actions.map((a) => {
    if (a.href && a.href !== "__PLACEHOLDER__") return a;

    const lower = a.title.toLowerCase();
    if (lower.includes("task")) return { ...a, href: "/my-tasks" };
    if (lower.includes("meeting") || lower.includes("calendar"))
      return { ...a, href: "/calendar" };
    if (lower.includes("project") && data.user.activeProjectIds[0])
      return { ...a, href: `/projects/${data.user.activeProjectIds[0]}` };
    return { ...a, href: "/home" };
  });
}

// =============================================================================
// Fallback Briefings
// =============================================================================

function buildAllClearBriefing(userName: string): DailyBriefing {
  const today = new Date();
  return {
    greeting: `Good morning, ${userName}!`,
    date: today.toISOString().split("T")[0],
    sections: [
      {
        title: "All Clear",
        icon: "check-circle",
        content: "You have no tasks due today, no overdue items, and no meetings scheduled. A quiet day to focus on deep work.",
      },
    ],
    keyActions: [
      { title: "Review your task backlog", priority: "low", href: "/my-tasks" },
    ],
    generatedAt: today.toISOString(),
    confidence: "high",
  };
}

function buildFallbackBriefing(data: BriefingData): DailyBriefing {
  const today = new Date();
  const sections: DailyBriefingSection[] = [];

  if (data.tasksToday.length > 0 || data.tasksOverdue.length > 0) {
    sections.push({
      title: "Your Tasks",
      icon: "check-circle",
      content: `You have **${data.tasksToday.length}** task${data.tasksToday.length !== 1 ? "s" : ""} due today` +
        (data.tasksOverdue.length > 0 ? ` and **${data.tasksOverdue.length}** overdue.` : "."),
      items: [
        ...data.tasksToday.map((t) => ({ text: t.title, badge: "due today" })),
        ...data.tasksOverdue.map((t) => ({ text: t.title, badge: "overdue" })),
      ],
    });
  }

  if (data.calendarEvents.length > 0) {
    sections.push({
      title: "Today's Meetings",
      icon: "calendar",
      content: `You have **${data.calendarEvents.length}** meeting${data.calendarEvents.length !== 1 ? "s" : ""} today.`,
      items: data.calendarEvents.map((e) => {
        const time = new Date(e.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        return { text: `${time} — ${e.title}` };
      }),
    });
  }

  if (data.healthAlerts.length > 0) {
    sections.push({
      title: "Heads Up",
      icon: "alert-triangle",
      content: `There ${data.healthAlerts.length === 1 ? "is" : "are"} **${data.healthAlerts.length}** active alert${data.healthAlerts.length !== 1 ? "s" : ""} in your projects.`,
      items: data.healthAlerts.map((a) => ({
        text: `${a.title} (${a.projectName})`,
        badge: a.severity,
      })),
    });
  }

  return {
    greeting: `Good morning, ${data.user.name}!`,
    date: today.toISOString().split("T")[0],
    sections,
    keyActions: data.tasksToday.length > 0
      ? [{ title: "Review your tasks due today", priority: "high" as const, href: "/my-tasks" }]
      : [{ title: "Check your task backlog", priority: "low" as const, href: "/my-tasks" }],
    generatedAt: today.toISOString(),
    confidence: "medium",
  };
}
