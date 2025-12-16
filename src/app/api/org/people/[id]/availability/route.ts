import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { id: personId } = await params;
    const body = await request.json();

    const { type, startDate, endDate, fraction, note } = body;

    if (!type || !startDate) {
      return NextResponse.json(
        { ok: false, error: "Type and startDate are required" },
        { status: 400 }
      );
    }

    if (type !== "UNAVAILABLE" && type !== "PARTIAL") {
      return NextResponse.json(
        { ok: false, error: "Type must be UNAVAILABLE or PARTIAL" },
        { status: 400 }
      );
    }

    if (type === "PARTIAL" && (fraction === undefined || fraction < 0 || fraction > 1)) {
      return NextResponse.json(
        { ok: false, error: "Fraction must be between 0 and 1 for PARTIAL type" },
        { status: 400 }
      );
    }

    // Verify person exists
    const person = await prisma.user.findUnique({
      where: { id: personId },
      select: { id: true },
    });

    if (!person) {
      return NextResponse.json(
        { ok: false, error: "Person not found" },
        { status: 404 }
      );
    }

    const availability = await prisma.personAvailability.create({
      data: {
        personId,
        type,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        fraction: type === "PARTIAL" ? fraction : null,
        note: note || null,
      },
    });

    return NextResponse.json({ ok: true, availability });
  } catch (error) {
    console.error("Failed to create availability:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create availability" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await getOrgContext(request);
    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { id: personId } = await params;

    const availability = await prisma.personAvailability.findMany({
      where: {
        personId,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({ ok: true, availability });
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

