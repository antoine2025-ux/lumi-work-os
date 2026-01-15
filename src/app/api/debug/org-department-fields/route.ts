import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function stripAnsi(s: string) {
  // remove ANSI escape codes
  return s.replace(/\u001b\[[0-9;]*m/g, "");
}

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  try {
    // Intentionally pass a bogus field to trigger PrismaClientValidationError,
    // which includes the model's available options in the message.
    await prisma.orgDepartment.update({
      where: { id: "___debug___" },
      data: { __debugFieldDoesNotExist__: "x" } as any,
    });

    return NextResponse.json({ ok: true, note: "Unexpectedly did not throw." });
  } catch (e: any) {
    const raw = String(e?.message ?? e);
    const msg = stripAnsi(raw);

    // Heuristic: Prisma prints lines like:
    // "Available options are listed in green."
    // and shows the allowed fields in the invocation snippet.
    // We'll just return the whole stripped message so you can see the field list.
    return NextResponse.json({
      ok: false,
      message: msg,
      hint:
        "Search within `message` for the `data:` block; it will list the valid fields for OrgDepartment.",
    });
  }
}

