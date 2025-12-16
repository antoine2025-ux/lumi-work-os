import { NextRequest, NextResponse } from "next/server";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { listOrgAuditForOrg } from "@/lib/orgAudit";

type ExportFormat = "csv" | "json";

function parseFormat(search: string | null): ExportFormat {
  const normalized = (search ?? "").toLowerCase();
  if (normalized === "json") return "json";
  return "csv";
}

function buildCsv(rows: {
  createdAt: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  meta: string;
}[]): string {
  const header = [
    "createdAt",
    "action",
    "targetType",
    "targetId",
    "actorName",
    "actorEmail",
    "meta",
  ];

  const escape = (value: string) => {
    const needsQuotes = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.createdAt,
        row.action,
        row.targetType ?? "",
        row.targetId ?? "",
        row.actorName ?? "",
        row.actorEmail ?? "",
        row.meta,
      ]
        .map((v) => escape(v ?? ""))
        .join(",")
    ),
  ];

  return lines.join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const resolvedParams = await params;
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_ORG_ID", message: "Organization id is required." },
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const format = parseFormat(url.searchParams.get("format"));
  const limitParam = url.searchParams.get("limit");
  const limit = (() => {
    const parsed = limitParam ? parseInt(limitParam, 10) : NaN;
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) return parsed;
    return 500; // sensible default upper bound
  })();

  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:activity:export");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "You are not allowed to export activity for this org.",
          },
        },
        { status }
      );
    }

    // Verify orgId matches context
    if (context!.orgId !== orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ORG_MISMATCH",
            message: "Organization ID mismatch.",
          },
        },
        { status: 400 }
      );
    }

    const logs = await listOrgAuditForOrg(orgId, limit);

    if (format === "json") {
      return NextResponse.json({
        ok: true,
        data: logs.map((log) => ({
          id: log.id,
          orgId: log.workspaceId,
          action: log.action,
          targetType: log.entityType,
          targetId: log.entityId,
          meta: log.metadata as any,
          createdAt: log.createdAt.toISOString(),
          actor: log.actor
            ? {
                id: log.actor.id,
                name: log.actor.name ?? null,
                email: log.actor.email ?? null,
              }
            : null,
        })),
      });
    }

    // CSV export
    const csvRows = logs.map((log) => {
      const metaString =
        log.metadata != null ? JSON.stringify(log.metadata) : "";

      return {
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        targetType: log.entityType,
        targetId: log.entityId,
        actorName: log.actor?.name ?? null,
        actorEmail: log.actor?.email ?? null,
        meta: metaString,
      };
    });

    const csv = buildCsv(csvRows);
    const fileName = `loopwell-org-activity-${orgId}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[org-activity-export]", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to export organization activity.",
        },
      },
      { status: 500 }
    );
  }
}

