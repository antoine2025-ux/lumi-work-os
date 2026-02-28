/**
 * Onboarding Briefing Generator
 *
 * Generates a personalized narrative briefing for a new workspace member or a
 * person who has just been assigned to a project/role. The briefing covers:
 *   1. Your Company  — workspace overview, mission, team structure
 *   2. Your Team     — teammates, lead, what the team owns
 *   3. Your Projects — assigned projects, status, key milestones
 *   4. Governance    — who decides what, escalation paths
 *   5. Getting Started — first-action checklist with real internal URLs
 *
 * Caching: result is persisted as a ProactiveInsight (category: ONBOARDING)
 * and re-used for 24 hours. Dismissed insights are excluded from the cache.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { resolveUserContext } from "@/lib/loopbrain/user-context";
import { callLoopbrainLLM } from "@/lib/loopbrain/orchestrator";

// =============================================================================
// Public Types
// =============================================================================

export type OnboardingBriefingSectionIcon =
  | "building"
  | "users"
  | "folder"
  | "shield"
  | "rocket";

export interface OnboardingBriefingSection {
  title: string;
  /** Markdown-formatted narrative content */
  content: string;
  icon: OnboardingBriefingSectionIcon;
}

export interface OnboardingBriefingAction {
  label: string;
  description: string;
  /** Internal URL path (e.g. /my-tasks, /projects/abc123) */
  url: string;
  priority: "high" | "medium" | "low";
}

export interface OnboardingBriefing {
  /** "Welcome to [workspace], [name]!" */
  greeting: string;
  /** "As [title] on the [team] team, you'll be..." */
  roleSummary: string;
  sections: OnboardingBriefingSection[];
  suggestedFirstActions: OnboardingBriefingAction[];
  generatedAt: Date;
  confidence: "high" | "medium" | "low";
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_TTL_HOURS = 24;
const BRIEFING_EXPIRY_DAYS = 30;
const MIN_PEOPLE_FOR_FULL_BRIEFING = 3;
const RECENT_ACTIVITY_DAYS = 7;

// =============================================================================
// Main Export
// =============================================================================

export async function generateOnboardingBriefing(
  userId: string,
  workspaceId: string,
  options?: {
    /** Specific project to focus on */
    projectId?: string;
    /** True when this is a role change, not a first-time join */
    roleChange?: boolean;
  }
): Promise<OnboardingBriefing> {
  const startTime = Date.now();

  // ── 1. Cache check: return active ONBOARDING insight within TTL ──────────
  const cached = await findCachedBriefing(userId, workspaceId);
  if (cached) {
    logger.info("[onboarding-briefing] Returning cached briefing", {
      userId,
      workspaceId,
    });
    return cached;
  }

  // ── 2. Resolve user context ───────────────────────────────────────────────
  const userCtx = await resolveUserContext(userId, workspaceId);

  // ── 3. Three batched DB round-trips ──────────────────────────────────────
  const [workspaceData, teamData, governanceData] = await Promise.all([
    loadWorkspaceContext(workspaceId, userId),
    loadTeamContext(workspaceId, userCtx.teamId),
    loadGovernanceContext(workspaceId, userCtx.teamId, options?.projectId),
  ]);

  // ── 4. Minimal-workspace guard ───────────────────────────────────────────
  const isMinimalWorkspace =
    workspaceData.peopleCount < MIN_PEOPLE_FOR_FULL_BRIEFING &&
    workspaceData.projects.length === 0;

  if (isMinimalWorkspace) {
    const briefing = buildMinimalWorkspaceBriefing(
      userCtx.name,
      workspaceData.workspaceName
    );
    await persistBriefing(userId, workspaceId, briefing);
    return briefing;
  }

  // ── 5. Build LLM prompt ──────────────────────────────────────────────────
  const prompt = buildBriefingPrompt({
    userCtx,
    workspaceData,
    teamData,
    governanceData,
    projectId: options?.projectId,
    roleChange: options?.roleChange ?? false,
  });

  // ── 6. Call LLM ──────────────────────────────────────────────────────────
  let llmResult: { content: string };
  try {
    llmResult = await callLoopbrainLLM(prompt, SYSTEM_PROMPT, {
      maxTokens: 2000,
      timeoutMs: 15000,
    });
  } catch (err) {
    logger.warn("[onboarding-briefing] LLM call failed, using fallback", {
      userId,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    const fallback = buildFallbackBriefing(userCtx, workspaceData);
    await persistBriefing(userId, workspaceId, fallback);
    return fallback;
  }

  // ── 7. Parse LLM response ────────────────────────────────────────────────
  const parsed = parseLLMBriefing(llmResult.content);

  // ── 8. Attach real internal URLs to first actions ────────────────────────
  const briefing = attachRealUrls(parsed, {
    userId,
    managerId: userCtx.managerId,
    teamId: userCtx.teamId,
    projectId: options?.projectId ?? workspaceData.projects[0]?.id ?? null,
    wikiSpaceId: workspaceData.wikiSpaceId,
    activeProjectIds: userCtx.activeProjectIds,
  });

  briefing.generatedAt = new Date();

  // ── 9. Persist as ProactiveInsight ───────────────────────────────────────
  await persistBriefing(userId, workspaceId, briefing);

  const elapsed = Date.now() - startTime;
  logger.info("[onboarding-briefing] Briefing generated", {
    userId,
    workspaceId,
    elapsed,
  });

  return briefing;
}

// =============================================================================
// Cache helpers
// =============================================================================

async function findCachedBriefing(
  userId: string,
  workspaceId: string
): Promise<OnboardingBriefing | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
  const insight = await prisma.proactiveInsight.findFirst({
    where: {
      workspaceId,
      category: "ONBOARDING",
      status: "ACTIVE",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!insight || !insight.metadata) return null;

  const meta = insight.metadata as Record<string, unknown>;
  if (meta.userId !== userId) return null;

  const briefing = meta.briefing as OnboardingBriefing | undefined;
  if (!briefing) return null;

  return {
    ...briefing,
    generatedAt: new Date(briefing.generatedAt),
  };
}

async function persistBriefing(
  userId: string,
  workspaceId: string,
  briefing: OnboardingBriefing
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + BRIEFING_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  try {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId,
        trigger: "PATTERN_DETECTED",
        category: "ONBOARDING",
        priority: "INFO",
        title: `Onboarding briefing for ${userId}`,
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
  } catch (err) {
    // Non-fatal: briefing is still returned even if persistence fails
    logger.warn("[onboarding-briefing] Failed to persist briefing insight", {
      userId,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// =============================================================================
// Data loading (3 round-trips)
// =============================================================================

interface WorkspaceContextData {
  workspaceName: string;
  workspaceDescription: string | null;
  mission: string | null;
  industry: string | null;
  companyType: string | null;
  peopleCount: number;
  teamCount: number;
  departmentCount: number;
  wikiSpaceId: string | null;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    description: string | null;
    taskCount: number;
    completedTaskCount: number;
  }>;
  recentActivity: {
    pagesCreated: number;
    tasksCompleted: number;
  };
}

async function loadWorkspaceContext(
  workspaceId: string,
  userId: string
): Promise<WorkspaceContextData> {
  const since = new Date(
    Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000
  );

  const [workspace, peopleCount, teamCount, departmentCount, projects, recentPages, recentTasks, wikiSpace] =
    await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          name: true,
          description: true,
          mission: true,
          industry: true,
          companyType: true,
        },
      }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
      prisma.orgTeam.count({ where: { workspaceId, isActive: true } }),
      prisma.orgDepartment.count({ where: { workspaceId } }),
      prisma.project.findMany({
        where: {
          workspaceId,
          isArchived: false,
          status: "ACTIVE",
          members: { some: { userId } },
        },
        select: {
          id: true,
          name: true,
          status: true,
          description: true,
          _count: { select: { epics: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.wikiPage.count({
        where: { workspaceId, createdAt: { gte: since } },
      }).catch(() => 0),
      prisma.task.count({
        where: {
          workspaceId,
          status: "DONE",
          updatedAt: { gte: since },
        },
      }).catch(() => 0),
      prisma.space.findFirst({
        where: { workspaceId, type: "WIKI" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }).catch(() => null),
    ]);

  return {
    workspaceName: workspace?.name ?? "your workspace",
    workspaceDescription: workspace?.description ?? null,
    mission: workspace?.mission ?? null,
    industry: workspace?.industry ?? null,
    companyType: workspace?.companyType ?? null,
    peopleCount,
    teamCount,
    departmentCount,
    wikiSpaceId: wikiSpace?.id ?? null,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      description: p.description,
      taskCount: p._count.epics,
      completedTaskCount: 0,
    })),
    recentActivity: {
      pagesCreated: recentPages,
      tasksCompleted: recentTasks,
    },
  };
}

interface TeamContextData {
  teamName: string | null;
  teamDescription: string | null;
  leadName: string | null;
  leadId: string | null;
  members: Array<{ id: string; name: string; title: string | null }>;
  departmentName: string | null;
  departmentHeadName: string | null;
}

async function loadTeamContext(
  workspaceId: string,
  teamId: string | null
): Promise<TeamContextData> {
  if (!teamId) {
    return {
      teamName: null,
      teamDescription: null,
      leadName: null,
      leadId: null,
      members: [],
      departmentName: null,
      departmentHeadName: null,
    };
  }

  const team = await prisma.orgTeam.findFirst({
    where: { id: teamId, workspaceId },
    select: {
      name: true,
      description: true,
      leaderId: true,
      leader: { select: { id: true, name: true } },
      department: {
        select: {
          name: true,
        },
      },
      positions: {
        where: { isActive: true },
        select: {
          userId: true,
          title: true,
          user: { select: { id: true, name: true } },
        },
        take: 10,
      },
    },
  });

  if (!team) {
    return {
      teamName: null,
      teamDescription: null,
      leadName: null,
      leadId: null,
      members: [],
      departmentName: null,
      departmentHeadName: null,
    };
  }

  return {
    teamName: team.name,
    teamDescription: team.description ?? null,
    leadName: team.leader?.name ?? null,
    leadId: team.leader?.id ?? null,
    members: team.positions
      .filter((p) => p.user != null)
      .map((p) => ({
        id: p.user!.id,
        name: p.user!.name ?? "Unknown",
        title: p.title ?? null,
      })),
    departmentName: team.department?.name ?? null,
    departmentHeadName: null,
  };
}

interface GovernanceContextData {
  decisionDomains: Array<{
    name: string;
    description: string | null;
  }>;
  projectGoals: Array<{ title: string; status: string }>;
}

async function loadGovernanceContext(
  workspaceId: string,
  _teamId: string | null,
  projectId?: string
): Promise<GovernanceContextData> {
  const [domains, goals] = await Promise.all([
    prisma.decisionDomain.findMany({
      where: { workspaceId, isArchived: false },
      select: { name: true, description: true },
      take: 6,
      orderBy: { name: "asc" },
    }),
      projectId
        ? prisma.goal.findMany({
            where: { workspaceId, status: { in: ["ACTIVE", "DRAFT"] } },
            select: { title: true, status: true },
            take: 4,
            orderBy: { updatedAt: "desc" },
          }).catch(() => [] as Array<{ title: string; status: string }>)
        : Promise.resolve([] as Array<{ title: string; status: string }>),
  ]);

  return {
    decisionDomains: domains,
    projectGoals: goals,
  };
}

// =============================================================================
// Prompt construction
// =============================================================================

const SYSTEM_PROMPT = `You are Loopbrain, an intelligent organizational assistant.
Your task is to generate a warm, clear, and concise onboarding briefing for a new team member.
The briefing must be personalized, professional, and calm — not overwhelming.
Maximum length: ~1,200 words across all sections combined.

Respond with ONLY a valid JSON object (no markdown fences, no extra text) matching this exact shape:
{
  "greeting": "string — Welcome to [workspace], [name]!",
  "roleSummary": "string — 1-2 sentences about their role and what they will do",
  "sections": [
    {
      "title": "string",
      "content": "string — markdown formatted, 100-300 words",
      "icon": "building|users|folder|shield|rocket"
    }
  ],
  "suggestedFirstActions": [
    {
      "label": "string — short action label",
      "description": "string — one sentence explanation",
      "url": "__PLACEHOLDER__",
      "priority": "high|medium|low"
    }
  ]
}

Always include exactly 5 sections in this order:
1. "Your Company" (icon: building)
2. "Your Team" (icon: users)
3. "Your Projects" (icon: folder)
4. "Governance & Decisions" (icon: shield)
5. "Getting Started" (icon: rocket)

If data is missing for a section, write a helpful placeholder instead of leaving it empty.
Set url to "__PLACEHOLDER__" for all suggestedFirstActions — URLs are injected programmatically.`;

function buildBriefingPrompt(params: {
  userCtx: Awaited<ReturnType<typeof resolveUserContext>>;
  workspaceData: WorkspaceContextData;
  teamData: TeamContextData;
  governanceData: GovernanceContextData;
  projectId?: string;
  roleChange: boolean;
}): string {
  const { userCtx, workspaceData, teamData, governanceData, roleChange } =
    params;

  const contextLines: string[] = [
    `## Person`,
    `Name: ${userCtx.name}`,
    `Title: ${userCtx.title ?? "Not yet assigned"}`,
    `Role: ${userCtx.role}`,
    `Manager: ${userCtx.managerName ?? "Not yet assigned"}`,
    `Team: ${userCtx.teamName ?? "Not yet assigned"}`,
    `Department: ${userCtx.departmentName ?? "Not yet assigned"}`,
    `Situation: ${roleChange ? "Role change — existing member taking on new responsibilities" : "New to the workspace"}`,
    ``,
    `## Workspace`,
    `Name: ${workspaceData.workspaceName}`,
    workspaceData.workspaceDescription
      ? `Description: ${workspaceData.workspaceDescription}`
      : "",
    workspaceData.mission ? `Mission: ${workspaceData.mission}` : "",
    workspaceData.industry ? `Industry: ${workspaceData.industry}` : "",
    workspaceData.companyType ? `Company type: ${workspaceData.companyType}` : "",
    `People: ${workspaceData.peopleCount}`,
    `Active teams: ${workspaceData.teamCount}`,
    `Departments: ${workspaceData.departmentCount}`,
    `Recent activity (last 7 days): ${workspaceData.recentActivity.pagesCreated} pages created, ${workspaceData.recentActivity.tasksCompleted} tasks completed`,
    ``,
    `## Team`,
    `Team name: ${teamData.teamName ?? "Not assigned"}`,
    teamData.teamDescription ? `Description: ${teamData.teamDescription}` : "",
    `Lead: ${teamData.leadName ?? "Not assigned"}`,
    `Department: ${teamData.departmentName ?? "Not specified"}`,
    `Department head: ${teamData.departmentHeadName ?? "Not specified"}`,
    `Members (${teamData.members.length}):`,
    ...teamData.members.map(
      (m) => `  - ${m.name}${m.title ? ` (${m.title})` : ""}`
    ),
    ``,
    `## Assigned Projects`,
    workspaceData.projects.length > 0
      ? workspaceData.projects
          .map(
            (p) =>
              `  - ${p.name} [${p.status}]${p.description ? `: ${p.description.slice(0, 80)}` : ""}`
          )
          .join("\n")
      : "  No projects assigned yet",
    ``,
    `## Active Goals`,
    governanceData.projectGoals.length > 0
      ? governanceData.projectGoals
          .map((g) => `  - ${g.title} [${g.status}]`)
          .join("\n")
      : "  No goals defined yet",
    ``,
    `## Decision Domains`,
    governanceData.decisionDomains.length > 0
      ? governanceData.decisionDomains
          .map(
            (d) =>
              `  - ${d.name}${d.description ? `: ${d.description.slice(0, 60)}` : ""}`
          )
          .join("\n")
      : "  No decision domains defined yet",
  ];

  return contextLines.filter((l) => l !== "").join("\n");
}

// =============================================================================
// LLM response parser
// =============================================================================

function parseLLMBriefing(content: string): OnboardingBriefing {
  let raw: Record<string, unknown>;

  try {
    // Strip any accidental markdown fences
    const cleaned = content
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    raw = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    logger.warn("[onboarding-briefing] LLM returned non-JSON, using fallback parse");
    return buildTextFallbackBriefing(content);
  }

  const sections: OnboardingBriefingSection[] = [];
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  for (const s of rawSections) {
    if (
      typeof s === "object" &&
      s !== null &&
      typeof (s as Record<string, unknown>).title === "string" &&
      typeof (s as Record<string, unknown>).content === "string"
    ) {
      const sec = s as Record<string, unknown>;
      sections.push({
        title: String(sec.title),
        content: String(sec.content),
        icon: isValidIcon(sec.icon) ? sec.icon : "rocket",
      });
    }
  }

  const rawActions = Array.isArray(raw.suggestedFirstActions)
    ? raw.suggestedFirstActions
    : [];
  const suggestedFirstActions: OnboardingBriefingAction[] = rawActions
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null
    )
    .map((a) => ({
      label: String(a.label ?? "Action"),
      description: String(a.description ?? ""),
      url: String(a.url ?? "/home"),
      priority: isPriority(a.priority) ? a.priority : "medium",
    }));

  return {
    greeting: String(raw.greeting ?? "Welcome!"),
    roleSummary: String(raw.roleSummary ?? ""),
    sections,
    suggestedFirstActions,
    generatedAt: new Date(),
    confidence: sections.length >= 4 ? "high" : sections.length >= 2 ? "medium" : "low",
  };
}

function isValidIcon(v: unknown): v is OnboardingBriefingSectionIcon {
  return (
    v === "building" ||
    v === "users" ||
    v === "folder" ||
    v === "shield" ||
    v === "rocket"
  );
}

function isPriority(v: unknown): v is "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low";
}

function buildTextFallbackBriefing(rawContent: string): OnboardingBriefing {
  return {
    greeting: "Welcome to the team!",
    roleSummary:
      "We're preparing your personalized briefing. Here's a summary of what Loopbrain found.",
    sections: [
      {
        title: "Your Briefing",
        content: rawContent.slice(0, 1500),
        icon: "rocket",
      },
    ],
    suggestedFirstActions: [
      {
        label: "Check your tasks",
        description: "Review what's assigned to you",
        url: "/my-tasks",
        priority: "high",
      },
    ],
    generatedAt: new Date(),
    confidence: "low",
  };
}

// =============================================================================
// URL injection
// =============================================================================

function attachRealUrls(
  briefing: OnboardingBriefing,
  context: {
    userId: string;
    managerId: string | null;
    teamId: string | null;
    projectId: string | null;
    wikiSpaceId: string | null;
    activeProjectIds: string[];
  }
): OnboardingBriefing {
  // Build a pool of high-value first actions with real URLs
  const urlPool: OnboardingBriefingAction[] = [
    {
      label: "Check your assigned tasks",
      description: "See all tasks currently assigned to you across projects.",
      url: "/my-tasks",
      priority: "high",
    },
    ...(context.managerId
      ? [
          {
            label: "Meet your manager",
            description: "View your manager's profile and schedule a 1:1.",
            url: `/org/people/${context.managerId}`,
            priority: "high" as const,
          },
        ]
      : []),
    ...(context.teamId
      ? [
          {
            label: "Explore your team",
            description: "See your team members, roles, and responsibilities.",
            url: `/org/teams/${context.teamId}`,
            priority: "medium" as const,
          },
        ]
      : []),
    ...(context.wikiSpaceId
      ? [
          {
            label: "Browse the knowledge base",
            description: "Review key documentation and team wikis.",
            url: `/wiki/workspace/${context.wikiSpaceId}`,
            priority: "medium" as const,
          },
        ]
      : [
          {
            label: "Browse the wiki",
            description: "Review key documentation and team wikis.",
            url: `/wiki`,
            priority: "medium" as const,
          },
        ]),
    ...(context.projectId
      ? [
          {
            label: "Explore your project",
            description: "View current project status, tasks, and milestones.",
            url: `/projects/${context.projectId}`,
            priority: "high" as const,
          },
        ]
      : []),
    {
      label: "Set up your profile",
      description: "Update your title, skills, and contact information.",
      url: `/settings/profile`,
      priority: "low",
    },
  ];

  // Replace __PLACEHOLDER__ URLs from LLM with real ones from pool
  let poolIndex = 0;
  const patched = briefing.suggestedFirstActions.map((action) => {
    if (action.url === "__PLACEHOLDER__" && poolIndex < urlPool.length) {
      const replacement = urlPool[poolIndex++];
      return {
        ...action,
        url: replacement.url,
        label: action.label !== "Action" ? action.label : replacement.label,
      };
    }
    return action;
  });

  // If LLM produced fewer actions than the pool, append remaining pool entries
  const remaining = urlPool.slice(poolIndex);
  const allActions = [...patched, ...remaining].slice(0, 6);

  return { ...briefing, suggestedFirstActions: allActions };
}

// =============================================================================
// Minimal workspace briefing (no LLM call)
// =============================================================================

function buildMinimalWorkspaceBriefing(
  userName: string,
  workspaceName: string
): OnboardingBriefing {
  return {
    greeting: `Welcome to ${workspaceName}, ${userName}!`,
    roleSummary:
      "Your workspace is just getting started. Here are the first steps to set it up.",
    sections: [
      {
        title: "Your Company",
        icon: "building",
        content:
          `**${workspaceName}** is a new workspace. Start by adding your company mission and description in Settings so Loopbrain can provide richer context.\n\n` +
          `Once you've set up the basics, your briefings will automatically include company context, team structure, and project details.`,
      },
      {
        title: "Your Team",
        icon: "users",
        content:
          "No team members have been added yet. Invite your colleagues so Loopbrain can map your team structure, responsibilities, and capacity.",
      },
      {
        title: "Your Projects",
        icon: "folder",
        content:
          "No projects exist yet. Create your first project to start tracking work, milestones, and deliverables.",
      },
      {
        title: "Governance & Decisions",
        icon: "shield",
        content:
          "Decision domains haven't been defined yet. These help the team understand who decides what — configure them in Org Settings.",
      },
      {
        title: "Getting Started",
        icon: "rocket",
        content:
          "Here are the first things to do:\n\n" +
          "1. **Invite your team** — head to Settings → Members\n" +
          "2. **Create a project** — go to Projects → New Project\n" +
          "3. **Set up your org structure** — go to Org → Departments & Teams\n" +
          "4. **Configure Loopbrain** — ask any question to activate AI context",
      },
    ],
    suggestedFirstActions: [
      {
        label: "Invite team members",
        description: "Add colleagues to your workspace.",
        url: "/settings/members",
        priority: "high",
      },
      {
        label: "Create your first project",
        description: "Set up a project to start tracking work.",
        url: "/projects",
        priority: "high",
      },
      {
        label: "Set up org structure",
        description: "Define departments and teams.",
        url: "/org",
        priority: "medium",
      },
      {
        label: "Update workspace settings",
        description: "Add your company mission and description.",
        url: "/settings/workspace",
        priority: "medium",
      },
    ],
    generatedAt: new Date(),
    confidence: "high",
  };
}

// =============================================================================
// Fallback briefing (LLM timeout/error)
// =============================================================================

function buildFallbackBriefing(
  userCtx: Awaited<ReturnType<typeof resolveUserContext>>,
  workspaceData: WorkspaceContextData
): OnboardingBriefing {
  const teamLine = userCtx.teamName
    ? ` on the **${userCtx.teamName}** team`
    : "";
  const titleLine = userCtx.title ? ` as **${userCtx.title}**` : "";

  return {
    greeting: `Welcome to ${workspaceData.workspaceName}, ${userCtx.name}!`,
    roleSummary: `You're joining${titleLine}${teamLine}. Loopbrain is here to help you get up to speed.`,
    sections: [
      {
        title: "Your Company",
        icon: "building",
        content:
          `**${workspaceData.workspaceName}** has ${workspaceData.peopleCount} member${workspaceData.peopleCount !== 1 ? "s" : ""} across ${workspaceData.teamCount} team${workspaceData.teamCount !== 1 ? "s" : ""}.` +
          (workspaceData.mission ? `\n\n**Mission:** ${workspaceData.mission}` : ""),
      },
      {
        title: "Your Team",
        icon: "users",
        content: userCtx.teamName
          ? `You're part of the **${userCtx.teamName}** team${userCtx.managerName ? `. Your manager is **${userCtx.managerName}**` : ""}.`
          : "Your team assignment is pending. Check with your manager or workspace admin.",
      },
      {
        title: "Your Projects",
        icon: "folder",
        content:
          workspaceData.projects.length > 0
            ? `You're assigned to:\n\n${workspaceData.projects.map((p) => `- **${p.name}** [${p.status}]`).join("\n")}`
            : "No projects assigned yet. Check with your manager for upcoming project assignments.",
      },
      {
        title: "Governance & Decisions",
        icon: "shield",
        content: "Review your team's decision domains in the Org section to understand who owns what decisions.",
      },
      {
        title: "Getting Started",
        icon: "rocket",
        content:
          "1. Review your assigned tasks\n2. Introduce yourself to your team\n3. Browse the knowledge base\n4. Schedule a 1:1 with your manager",
      },
    ],
    suggestedFirstActions: [
      {
        label: "Check your tasks",
        description: "Review your current task assignments.",
        url: "/my-tasks",
        priority: "high",
      },
      ...(userCtx.managerId
        ? [
            {
              label: "Meet your manager",
              description: "View your manager's profile.",
              url: `/org/people/${userCtx.managerId}`,
              priority: "high" as const,
            },
          ]
        : []),
      {
        label: "Browse the wiki",
        description: "Explore team documentation.",
        url: "/wiki",
        priority: "medium",
      },
    ],
    generatedAt: new Date(),
    confidence: "medium",
  };
}
