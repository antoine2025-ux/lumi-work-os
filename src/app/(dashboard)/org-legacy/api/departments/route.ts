import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId(request);

    const departmentsCount = await prisma.orgDepartment.count({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    return NextResponse.json({
      departmentsCount,
    });
  } catch (error) {
    console.error("Org Departments Error", error);
    return new Response("Error loading org departments", { status: 500 });
  }
}

