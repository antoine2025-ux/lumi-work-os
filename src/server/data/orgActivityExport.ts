import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import {
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";

const EXPORT_MAX_ROWS = 5000;
const EXPORT_WINDOW_MINUTES = 10;
const EXPORT_MAX_PER_WINDOW = 3;

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

export type OrgActivityExportFormat = "csv" | "json";

export async function prepareOrgActivityExport(params: {
  workspaceId: string;
  format: OrgActivityExportFormat;
  eventFilter?: OrgActivityEventFilter;
  timeframe?: OrgActivityTimeframeFilter;
}) {
  const { workspaceId, format, eventFilter, timeframe } = params;

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
    const err: any = new Error("Not authorized to export for this workspace.");
    err.statusCode = 403;
    throw err;
  }

  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    const err: any = new Error("Only admins can export workspace activity.");
    err.statusCode = 403;
    throw err;
  }

  // Rate limiting: max EXPORT_MAX_PER_WINDOW per user/workspace per EXPORT_WINDOW_MINUTES.
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - EXPORT_WINDOW_MINUTES * 60 * 1000
  );

  const exportCount = await prisma.orgActivityExport.count({
    where: {
      workspaceId,
      userId: auth.user.userId,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (exportCount >= EXPORT_MAX_PER_WINDOW) {
    const err: any = new Error(
      `Export limit reached. Please wait a few minutes before exporting again.`
    );
    err.statusCode = 429;
    throw err;
  }

  const eventFilterWhere = buildEventFilter(eventFilter);
  const timeframeWhere = buildTimeframeFilter(timeframe);

  const logs = await prisma.orgAuditLog.findMany({
    where: {
      workspaceId,
      ...(eventFilterWhere ?? {}),
      ...(timeframeWhere ?? {}),
      event: {
        not: null, // Only include logs with event field set
      },
    },
    orderBy: { createdAt: "desc" },
    take: EXPORT_MAX_ROWS,
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

  // Record this export for rate limiting.
  await prisma.orgActivityExport.create({
    data: {
      workspaceId,
      userId: auth.user.userId,
    },
  });

  const rows = logs.map((log) => ({
    id: log.id,
    workspaceId: log.workspaceId,
    event: log.event || "",
    actorUserId: log.actorUserId,
    actorName: log.actor?.name ?? null,
    actorEmail: log.actor?.email ?? null,
    targetUserId: log.targetUserId,
    targetName: log.target?.name ?? null,
    targetEmail: log.target?.email ?? null,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }));

  if (format === "json") {
    const body = JSON.stringify(rows, null, 2);
    const filename = `workspace-activity-${workspaceId}-${now.toISOString().split('T')[0]}.json`;

    return {
      contentType: "application/json",
      filename,
      body,
    };
  }

  // CSV
  const header = [
    "id",
    "workspaceId",
    "event",
    "createdAt",
    "actorUserId",
    "actorName",
    "actorEmail",
    "targetUserId",
    "targetName",
    "targetEmail",
    "metadataJson",
  ];

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const row of rows) {
    const metadataJson =
      row.metadata == null ? "" : JSON.stringify(row.metadata);
    lines.push(
      [
        row.id,
        row.workspaceId,
        row.event,
        row.createdAt,
        row.actorUserId ?? "",
        row.actorName ?? "",
        row.actorEmail ?? "",
        row.targetUserId ?? "",
        row.targetName ?? "",
        row.targetEmail ?? "",
        metadataJson,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const body = lines.join("\n");
  const filename = `workspace-activity-${workspaceId}-${now.toISOString().split('T')[0]}.csv`;

  return {
    contentType: "text/csv",
    filename,
    body,
  };
}

