import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { buildOrgQaSnapshotMarkdown } from "@/lib/loopbrain/org-qa-snapshot";
import type { OrgQaSnapshotPayload } from "@/lib/loopbrain/org-qa-snapshot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Dev-only endpoint
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        error: "QA export is not available in production.",
      },
      { status: 404 }
    );
  }

  try {
    const body = (await request.json()) as OrgQaSnapshotPayload;

    if (!body.generatedAt || !Array.isArray(body.questions)) {
      return NextResponse.json(
        { ok: false, error: "Invalid snapshot payload" },
        { status: 400 }
      );
    }

    const markdown = buildOrgQaSnapshotMarkdown(body);

    const root = process.cwd();
    const qaDir = path.join(root, "docs", "org", "qa");

    await fs.mkdir(qaDir, { recursive: true });

    const ts = new Date(body.generatedAt);
    const fileName = `org-qa-snapshot-${formatTimestampForFile(ts)}.md`;
    const filePath = path.join(qaDir, fileName);

    await fs.writeFile(filePath, markdown, "utf-8");

    return NextResponse.json({
      ok: true,
      file: `docs/org/qa/${fileName}`,
    });
  } catch (error: unknown) {
    console.error("[ORG_QA_EXPORT_ERROR]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to export QA snapshot" },
      { status: 500 }
    );
  }
}

function formatTimestampForFile(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

