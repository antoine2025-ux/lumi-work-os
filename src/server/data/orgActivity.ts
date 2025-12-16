import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";

export type OrgActivityItem = {
  id: string;
  workspaceId: string;
  event: string;
  actorUserId: string | null;
  targetUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
};

export type OrgActivityEventFilter =
  | "all"
  | "org"
  | "membership"
  | "ownership";

export type OrgActivityTimeframeFilter =
  | "7d"
  | "30d"
  | "90d"
  | "all";

type GetOrgActivityOptions = {
  workspaceId: string;
  limit?: number;
  cursor?: string | null;
  eventFilter?: OrgActivityEventFilter;
  timeframe?: OrgActivityTimeframeFilter;
};

export type OrgActivityResult = {
  items: OrgActivityItem[];
  nextCursor: string | null;
};

function buildEventFilter(eventFilter: OrgActivityEventFilter | undefined) {
  const ef = eventFilter ?? "all";

  if (ef === "all") {
    return undefined;
  }

  if (ef === "org") {
    return {
      event: {
        in: ["ORG_CREATED", "ORG_DELETED"],
      },
    } as const;
  }

  if (ef === "membership") {
    return {
      event: {
        in: [
          "MEMBER_ADDED",
          "MEMBER_REMOVED",
          "MEMBER_ROLE_CHANGED",
        ],
      },
    } as const;
  }

  if (ef === "ownership") {
    return {
      event: {
        in: ["ORG_OWNERSHIP_TRANSFERRED"],
      },
    } as const;
  }

  return undefined;
}

function buildTimeframeFilter(timeframe: OrgActivityTimeframeFilter | undefined) {
  const tf = timeframe ?? "all";

  if (tf === "all") {
    return undefined;
  }

  const now = new Date();
  let from: Date | null = null;

  if (tf === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (tf === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (tf === "90d") {
    from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  if (!from) return undefined;

  return {
    createdAt: {
      gte: from,
    },
  } as const;
}

export async function getOrgActivityForWorkspace(
  options: GetOrgActivityOptions
): Promise<OrgActivityResult> {
  const {
    workspaceId,
    limit = 20,
    cursor,
    eventFilter = "all",
    timeframe = "all",
  } = options;

  const auth = await getUnifiedAuth();
  if (!auth.isAuthenticated || !auth.user.userId) {
    throw new Error("Not authenticated");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: auth.user.userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw new Error("Not authorized to view this workspace.");
  }

  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    throw new Error("Not authorized to view activity.");
  }

  const eventFilterWhere = buildEventFilter(eventFilter);
  const timeframeWhere = buildTimeframeFilter(timeframe);

  const logs = await prisma.orgAuditLog.findMany({
    where: {
      workspaceId,
      ...(eventFilterWhere ?? {}),
      ...(timeframeWhere ?? {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      target: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  let items = logs;
  if (logs.length > limit) {
    const last = logs[logs.length - 1];
    nextCursor = last.id;
    items = logs.slice(0, limit);
  }

  return {
    items: items
      .filter((log) => log.event) // Only include logs with event field set
      .map((log) => ({
        id: log.id,
        workspaceId: log.workspaceId,
        event: log.event || "",
        actorUserId: log.actorUserId,
        targetUserId: log.targetUserId,
        actorName: log.actor?.name ?? null,
        actorEmail: log.actor?.email ?? null,
        targetName: log.target?.name ?? null,
        targetEmail: log.target?.email ?? null,
        metadata: (log.metadata as any) ?? null,
        createdAt: log.createdAt,
      })),
    nextCursor,
  };
}

