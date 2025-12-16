import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const workspaceId = await getCurrentWorkspaceId(request);
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify project exists and belongs to workspace
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { orgId: workspaceId },
          { workspaceId }, // Fallback for projects without orgId
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract accountability fields (allow partial updates)
    const {
      ownerPersonId,
      ownerRole,
      decisionPersonId,
      decisionRole,
      escalationPersonId,
      escalationRole,
      backupOwnerPersonId,
      backupOwnerRole,
      backupDecisionPersonId,
      backupDecisionRole,
    } = body;

    // Prepare data for upsert (clear personId when role is set, and vice versa)
    const accountabilityData: any = {};

    // Owner: person OR role (mutually exclusive)
    if (ownerPersonId !== undefined) {
      accountabilityData.ownerPersonId = ownerPersonId || null;
      accountabilityData.ownerRole = null; // Clear role when person is set
    }
    if (ownerRole !== undefined) {
      accountabilityData.ownerRole = ownerRole || null;
      accountabilityData.ownerPersonId = null; // Clear person when role is set
    }

    // Decision: person OR role (mutually exclusive)
    if (decisionPersonId !== undefined) {
      accountabilityData.decisionPersonId = decisionPersonId || null;
      accountabilityData.decisionRole = null;
    }
    if (decisionRole !== undefined) {
      accountabilityData.decisionRole = decisionRole || null;
      accountabilityData.decisionPersonId = null;
    }

    // Escalation: person OR role (mutually exclusive)
    if (escalationPersonId !== undefined) {
      accountabilityData.escalationPersonId = escalationPersonId || null;
      accountabilityData.escalationRole = null;
    }
    if (escalationRole !== undefined) {
      accountabilityData.escalationRole = escalationRole || null;
      accountabilityData.escalationPersonId = null;
    }

    // Backup owner: person OR role (mutually exclusive)
    if (backupOwnerPersonId !== undefined) {
      accountabilityData.backupOwnerPersonId = backupOwnerPersonId || null;
      accountabilityData.backupOwnerRole = null;
    }
    if (backupOwnerRole !== undefined) {
      accountabilityData.backupOwnerRole = backupOwnerRole || null;
      accountabilityData.backupOwnerPersonId = null;
    }

    // Backup decision: person OR role (mutually exclusive)
    if (backupDecisionPersonId !== undefined) {
      accountabilityData.backupDecisionPersonId = backupDecisionPersonId || null;
      accountabilityData.backupDecisionRole = null;
    }
    if (backupDecisionRole !== undefined) {
      accountabilityData.backupDecisionRole = backupDecisionRole || null;
      accountabilityData.backupDecisionPersonId = null;
    }

    // Upsert ProjectAccountability
    const accountability = await prisma.projectAccountability.upsert({
      where: { projectId },
      create: {
        projectId,
        ...accountabilityData,
      },
      update: accountabilityData,
    });

    return NextResponse.json({
      ok: true,
      accountability: {
        ownerPersonId: accountability.ownerPersonId,
        ownerRole: accountability.ownerRole,
        decisionPersonId: accountability.decisionPersonId,
        decisionRole: accountability.decisionRole,
        escalationPersonId: accountability.escalationPersonId,
        escalationRole: accountability.escalationRole,
        backupOwnerPersonId: accountability.backupOwnerPersonId,
        backupOwnerRole: accountability.backupOwnerRole,
        backupDecisionPersonId: accountability.backupDecisionPersonId,
        backupDecisionRole: accountability.backupDecisionRole,
      },
    });
  } catch (error: any) {
    console.error("Error updating project accountability:", error);
    return NextResponse.json(
      { error: "Failed to update project accountability" },
      { status: 500 }
    );
  }
}

