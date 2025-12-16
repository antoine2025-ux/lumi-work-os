import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId(request);

    const teamsCount = await prisma.orgTeam.count({
      where: { workspaceId },
    });

    return NextResponse.json({ teamsCount });
  } catch (error) {
    console.error("Org Teams Error", error);
    return new Response("Error loading org teams", { status: 500 });
  }
}

